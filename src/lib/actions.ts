"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { memos, memoItems, payments, expenses } from "@/db/schema";
import { round2, tk, todayStr } from "@/lib/format";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { DICT, type Key, type T, type Vars } from "@/lib/i18n/dict";

export type ActionResult = { ok?: boolean; error?: string; message?: string };

async function requireAuth() {
  const jar = await cookies();
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) {
    throw new Error("Not logged in");
  }
}

/** An error the user should see, in their language */
class UserError extends Error {
  constructor(
    public key: Key,
    public vars?: Vars,
  ) {
    super(key);
  }
}

// Zod messages are dictionary keys; they are translated when shown
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "err.date");
const nonNeg = z.coerce.number().finite().min(0, "err.negative");
const count = z.coerce.number().int("err.whole").min(0, "err.negative");

const itemSchema = z.object({
  productName: z.string().trim().min(1, "err.productName").max(120),
  cartons: count,
  cartonPrice: nonNeg,
  pieces: count,
  piecePrice: nonNeg,
});

const memoSchema = z.object({
  date: ymd,
  customerName: z.string().trim().min(1, "err.customerName").max(120),
  phone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(300).default(""),
  note: z.string().trim().max(500).default(""),
  // Total paid so far for this memo (at sale + any later collections)
  paid: nonNeg,
  items: z.array(itemSchema).min(1, "err.addProduct").max(100),
});

export type MemoInput = z.input<typeof memoSchema>;

function firstError(t: T, e: z.ZodError) {
  const msg = e.issues[0]?.message;
  return msg && msg in DICT.en ? t(msg as Key) : t("err.form");
}

function calcItems(items: z.output<typeof itemSchema>[]) {
  const rows = items.map((it) => ({
    ...it,
    lineTotal: round2(it.cartons * it.cartonPrice + it.pieces * it.piecePrice),
  }));
  const total = round2(rows.reduce((s, r) => s + r.lineTotal, 0));
  return { rows, total };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------------- Memos ---------------- */

export async function saveMemo(id: number | null, input: MemoInput): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  const parsed = memoSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(t, parsed.error) };
  const data = parsed.data;

  const emptyLine = data.items.find((i) => i.cartons === 0 && i.pieces === 0);
  if (emptyLine) return { error: t("err.noQty", { name: emptyLine.productName }) };
  const noPrice = data.items.find(
    (i) => (i.cartons > 0 && i.cartonPrice === 0) || (i.pieces > 0 && i.piecePrice === 0),
  );
  if (noPrice) return { error: t("err.noPrice", { name: noPrice.productName }) };

  const { rows, total } = calcItems(data.items);

  let savedId = id;
  try {
    await db.transaction(async (tx) => {
      let later = 0;
      if (id) {
        const [{ s }] = await tx
          .select({ s: sql<string>`coalesce(sum(${payments.amount}), 0)` })
          .from(payments)
          .where(eq(payments.memoId, id));
        later = Number(s);
      }
      const paid = round2(data.paid);
      if (paid > total) throw new UserError("err.paidOverTotal", { amount: tk(total) });
      if (paid < later) throw new UserError("err.paidUnderLater", { amount: tk(later) });
      const values = {
        date: data.date,
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        note: data.note,
        total,
        initialPaid: round2(paid - later),
        paid,
        due: round2(total - paid),
      };

      if (id) {
        const updated = await tx.update(memos).set(values).where(eq(memos.id, id)).returning({ id: memos.id });
        if (!updated.length) throw new UserError("err.memoGone");
        await tx.delete(memoItems).where(eq(memoItems.memoId, id));
      } else {
        const [created] = await tx.insert(memos).values(values).returning({ id: memos.id });
        savedId = created.id;
      }
      await tx.insert(memoItems).values(rows.map((r) => ({ ...r, memoId: savedId! })));
    });
  } catch (e) {
    if (e instanceof UserError) return { error: t(e.key, e.vars) };
    throw e;
  }

  revalidateAll();
  redirect(`/sales/${savedId}?saved=1`);
}

export async function deleteMemo(id: number): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  await db.delete(memos).where(eq(memos.id, id));
  revalidateAll();
  return { ok: true, message: t("memo.deleted") };
}

/** Fill name/address when a known phone number is typed */
export async function lookupCustomer(phone: string) {
  await requireAuth();
  const p = phone.trim();
  if (p.length < 6) return null;
  const [row] = await db
    .select({ customerName: memos.customerName, address: memos.address })
    .from(memos)
    .where(eq(memos.phone, p))
    .orderBy(desc(memos.date), desc(memos.id))
    .limit(1);
  return row ?? null;
}

/* ---------------- Payments (due collection) ---------------- */

const paymentSchema = z.object({
  amount: z.coerce.number().finite().positive("err.amount"),
  date: ymd,
  note: z.string().trim().max(200).default(""),
});

async function syncMemoPaid(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], memoId: number) {
  const [m] = await tx.select().from(memos).where(eq(memos.id, memoId)).for("update");
  if (!m) throw new UserError("err.memoGone");
  const [{ s }] = await tx
    .select({ s: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.memoId, memoId));
  const paid = round2(m.initialPaid + Number(s));
  if (paid > m.total + 0.001) throw new UserError("err.overDue", { amount: tk(round2(m.total - m.paid)) });
  await tx.update(memos).set({ paid, due: round2(m.total - paid) }).where(eq(memos.id, memoId));
}

function readPayment(formData: FormData) {
  return paymentSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date") || todayStr(),
    note: formData.get("note") ?? "",
  });
}

export async function addPayment(memoId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  const parsed = readPayment(formData);
  if (!parsed.success) return { error: firstError(t, parsed.error) };
  const amount = round2(parsed.data.amount);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({ memoId, ...parsed.data, amount });
      await syncMemoPaid(tx, memoId);
    });
  } catch (e) {
    if (e instanceof UserError) return { error: t(e.key, e.vars) };
    throw e;
  }
  revalidateAll();
  return { ok: true, message: t("pay.saved", { amount: tk(amount) }) };
}

export async function deletePayment(paymentId: number, memoId: number): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  try {
    await db.transaction(async (tx) => {
      await tx.delete(payments).where(and(eq(payments.id, paymentId), eq(payments.memoId, memoId)));
      await syncMemoPaid(tx, memoId);
    });
  } catch (e) {
    if (e instanceof UserError) return { error: t(e.key, e.vars) };
    throw e;
  }
  revalidateAll();
  return { ok: true, message: t("memo.paymentRemoved") };
}

/**
 * Customer pays some money towards all their dues.
 * The money clears the oldest memo first, then the next one.
 */
export async function collectFromCustomer(
  customerKey: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  const parsed = readPayment(formData);
  if (!parsed.success) return { error: firstError(t, parsed.error) };
  const amount = round2(parsed.data.amount);
  let left = amount;

  try {
    await db.transaction(async (tx) => {
      const open = await tx
        .select({ id: memos.id, due: memos.due })
        .from(memos)
        .where(
          and(
            gt(memos.due, 0),
            sql`coalesce(nullif(${memos.phone}, ''), lower(trim(${memos.customerName}))) = ${customerKey}`,
          ),
        )
        .orderBy(asc(memos.date), asc(memos.id))
        .for("update");
      const totalDue = round2(open.reduce((a, m) => a + m.due, 0));
      if (!open.length) throw new UserError("err.noDue");
      if (left > totalDue + 0.001) throw new UserError("err.overDue", { amount: tk(totalDue) });

      for (const m of open) {
        if (left <= 0) break;
        const part = round2(Math.min(left, m.due));
        await tx.insert(payments).values({ memoId: m.id, date: parsed.data.date, amount: part, note: parsed.data.note });
        await syncMemoPaid(tx, m.id);
        left = round2(left - part);
      }
    });
  } catch (e) {
    if (e instanceof UserError) return { error: t(e.key, e.vars) };
    throw e;
  }
  revalidateAll();
  return { ok: true, message: t("pay.saved", { amount: tk(amount) }) };
}

/* ---------------- Expenses ---------------- */

const expenseSchema = z.object({
  person: z.enum(["AMAN", "ROFIQ"]),
  date: ymd,
  item: z.string().trim().min(1, "err.item").max(120),
  amount: z.coerce.number().finite().positive("err.amount"),
  note: z.string().trim().max(300).default(""),
});

export async function saveExpense(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  const id = Number(formData.get("id") || 0);
  const parsed = expenseSchema.safeParse({
    person: formData.get("person"),
    date: formData.get("date"),
    item: formData.get("item"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: firstError(t, parsed.error) };
  const values = { ...parsed.data, amount: round2(parsed.data.amount) };
  if (id) {
    await db.update(expenses).set(values).where(eq(expenses.id, id));
  } else {
    await db.insert(expenses).values(values);
  }
  revalidateAll();
  if (id) redirect(`/expenses/${values.person.toLowerCase()}?updated=1`);
  return { ok: true, message: t("exp.saved") };
}

export async function deleteExpense(id: number): Promise<ActionResult> {
  await requireAuth();
  const { t } = await getT();
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidateAll();
  return { ok: true, message: t("exp.deleted") };
}
