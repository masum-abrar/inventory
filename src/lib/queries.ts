import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { memos, memoItems, payments, expenses, type Person } from "@/db/schema";
import { addDays, isYmd, monthStartStr, todayStr, weekStartStr } from "@/lib/format";

const sumNum = (col: SQL | AnyPgColumn) => sql<string>`coalesce(sum(${col}), 0)`;

export const PAGE_SIZE = 20;

export function pageFrom(sp: { page?: string }) {
  const n = Math.floor(Number(sp.page));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Escape % and _ so a search like "50%" is matched literally */
function likeText(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}

/* ---------- Date range from ?range= or ?from=&to= ---------- */

export type RangeKey = "today" | "yesterday" | "week" | "month" | "all" | "custom";

export function resolveRange(sp: { range?: string; from?: string; to?: string }, fallback: RangeKey = "today") {
  const today = todayStr();
  let key = (sp.range as RangeKey) || fallback;
  if (key === "custom" || isYmd(sp.from) || isYmd(sp.to)) key = "custom";
  switch (key) {
    case "today":
      return { key, from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { key, from: y, to: y };
    }
    case "week":
      return { key, from: weekStartStr(), to: today };
    case "month":
      return { key, from: monthStartStr(), to: today };
    case "custom": {
      const from = isYmd(sp.from) ? sp.from : isYmd(sp.to) ? sp.to : today;
      const to = isYmd(sp.to) ? sp.to : today;
      return from <= to ? { key, from, to } : { key, from: to, to: from };
    }
    default:
      return { key: "all" as const, from: null, to: null };
  }
}

/* ---------- Memos ---------- */

export type MemoStatus = "all" | "due" | "paid";

function memoWhere(opts: { from: string | null; to: string | null; q?: string; status?: MemoStatus }) {
  const where: SQL[] = [];
  if (opts.from) where.push(gte(memos.date, opts.from));
  if (opts.to) where.push(lte(memos.date, opts.to));
  if (opts.status === "due") where.push(gt(memos.due, 0));
  if (opts.status === "paid") where.push(lte(memos.due, 0));
  const q = opts.q?.trim();
  if (q) {
    const like = likeText(q);
    const productMatch = db
      .select({ one: sql`1` })
      .from(memoItems)
      .where(and(eq(memoItems.memoId, memos.id), ilike(memoItems.productName, like)));
    where.push(
      or(
        ilike(memos.customerName, like),
        ilike(memos.phone, like),
        ilike(memos.address, like),
        sql`exists (${productMatch})`,
        // "15" or "#0015" finds memo 15
        /^#?\d{1,7}$/.test(q) ? eq(memos.id, Number(q.replace("#", ""))) : undefined,
      )!,
    );
  }
  return where.length ? and(...where) : undefined;
}

async function attachItems<T extends { id: number }>(rows: T[]) {
  if (!rows.length) return [] as (T & { items: { productName: string; cartons: number; pieces: number }[] })[];
  const items = await db
    .select({
      memoId: memoItems.memoId,
      productName: memoItems.productName,
      cartons: memoItems.cartons,
      pieces: memoItems.pieces,
    })
    .from(memoItems)
    .where(
      inArray(
        memoItems.memoId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(memoItems.id));
  return rows.map((r) => ({ ...r, items: items.filter((i) => i.memoId === r.id) }));
}

/** One page of memos + totals for everything that matches the filter */
export async function listMemos(opts: {
  from: string | null;
  to: string | null;
  q?: string;
  status?: MemoStatus;
  page?: number;
  pageSize?: number;
}) {
  const where = memoWhere(opts);
  const size = opts.pageSize ?? PAGE_SIZE;

  const [totals] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sumNum(memos.total),
      paid: sumNum(memos.paid),
      due: sumNum(memos.due),
    })
    .from(memos)
    .where(where);

  const pages = Math.max(1, Math.ceil(totals.count / size));
  const page = Math.min(Math.max(1, opts.page ?? 1), pages);

  const rows = await db
    .select({
      id: memos.id,
      date: memos.date,
      customerName: memos.customerName,
      phone: memos.phone,
      total: memos.total,
      paid: memos.paid,
      due: memos.due,
    })
    .from(memos)
    .where(where)
    .orderBy(desc(memos.date), desc(memos.id))
    .limit(size)
    .offset((page - 1) * size);

  return {
    rows: await attachItems(rows),
    page,
    pages,
    count: totals.count,
    sums: { total: Number(totals.total), paid: Number(totals.paid), due: Number(totals.due) },
  };
}

export async function memoTotals(from: string, to: string) {
  const [r] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sumNum(memos.total),
      due: sumNum(memos.due),
    })
    .from(memos)
    .where(and(gte(memos.date, from), lte(memos.date, to)));
  return { count: r.count, total: Number(r.total), due: Number(r.due) };
}

/** Cash actually received in a date range = paid at sale + later collections */
export async function collectedBetween(from: string, to: string) {
  const [a] = await db
    .select({ s: sumNum(memos.initialPaid) })
    .from(memos)
    .where(and(gte(memos.date, from), lte(memos.date, to)));
  const [b] = await db
    .select({ s: sumNum(payments.amount) })
    .from(payments)
    .where(and(gte(payments.date, from), lte(payments.date, to)));
  return { atSale: Number(a.s), later: Number(b.s), total: Number(a.s) + Number(b.s) };
}

export async function getMemo(id: number) {
  const [memo] = await db.select().from(memos).where(eq(memos.id, id));
  if (!memo) return null;
  const [items, pays] = await Promise.all([
    db.select().from(memoItems).where(eq(memoItems.memoId, id)).orderBy(asc(memoItems.id)),
    db.select().from(payments).where(eq(payments.memoId, id)).orderBy(asc(payments.date), asc(payments.id)),
  ]);
  return { ...memo, items, payments: pays };
}

export async function productNames() {
  const rows = await db
    .selectDistinct({ name: memoItems.productName })
    .from(memoItems)
    .orderBy(asc(memoItems.productName))
    .limit(300);
  return rows.map((r) => r.name);
}

export async function totalOutstanding() {
  const [r] = await db
    .select({ due: sumNum(memos.due), n: sql<number>`count(distinct ${customerKey})::int` })
    .from(memos)
    .where(gt(memos.due, 0));
  return { due: Number(r.due), customers: r.n };
}

/* ---------- Dues grouped by customer ---------- */

/** Same phone = same customer. Without a phone, the name is used. */
export const customerKey = sql<string>`coalesce(nullif(${memos.phone}, ''), lower(trim(${memos.customerName})))`;

export async function duesByCustomer(opts: { q?: string; page?: number }) {
  const where: SQL[] = [gt(memos.due, 0)];
  const q = opts.q?.trim();
  if (q) {
    const like = likeText(q);
    where.push(or(ilike(memos.customerName, like), ilike(memos.phone, like), ilike(memos.address, like))!);
  }
  const grouped = db
    .select({
      key: sql<string>`${customerKey}`.as("key"),
      customerName: sql<string>`(array_agg(${memos.customerName} order by ${memos.date} desc, ${memos.id} desc))[1]`.as("customer_name"),
      phone: sql<string>`max(${memos.phone})`.as("phone"),
      address: sql<string>`(array_agg(${memos.address} order by ${memos.date} desc, ${memos.id} desc))[1]`.as("address"),
      due: sql<string>`sum(${memos.due})`.as("due"),
      memoCount: sql<number>`count(*)::int`.as("memo_count"),
      oldest: sql<string>`min(${memos.date})::text`.as("oldest"),
    })
    .from(memos)
    .where(and(...where))
    .groupBy(customerKey)
    .as("g");

  const [c] = await db
    .select({ n: sql<number>`count(*)::int`, due: sql<string>`coalesce(sum(${grouped.due}), 0)` })
    .from(grouped);
  const pages = Math.max(1, Math.ceil(c.n / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page ?? 1), pages);

  const rows = await db
    .select()
    .from(grouped)
    .orderBy(desc(grouped.due), asc(grouped.customerName))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return {
    rows: rows.map((r) => ({ ...r, due: Number(r.due) })),
    page,
    pages,
    count: c.n,
    totalDue: Number(c.due),
  };
}

/* ---------- Expenses ---------- */

export async function listExpenses(person: Person, from: string | null, to: string | null, page = 1) {
  const where: SQL[] = [eq(expenses.person, person)];
  if (from) where.push(gte(expenses.date, from));
  if (to) where.push(lte(expenses.date, to));
  const size = 30;
  const [c] = await db
    .select({ n: sql<number>`count(*)::int`, s: sumNum(expenses.amount) })
    .from(expenses)
    .where(and(...where));
  const pages = Math.max(1, Math.ceil(c.n / size));
  const p = Math.min(Math.max(1, page), pages);
  const rows = await db
    .select()
    .from(expenses)
    .where(and(...where))
    .orderBy(desc(expenses.date), desc(expenses.id))
    .limit(size)
    .offset((p - 1) * size);
  return { rows, page: p, pages, count: c.n, sum: Number(c.s) };
}

export async function expenseTotal(person: Person | null, from: string, to: string) {
  const where: SQL[] = [gte(expenses.date, from), lte(expenses.date, to)];
  if (person) where.push(eq(expenses.person, person));
  const [r] = await db.select({ s: sumNum(expenses.amount) }).from(expenses).where(and(...where));
  return Number(r.s);
}

export async function getExpense(id: number) {
  const [r] = await db.select().from(expenses).where(eq(expenses.id, id));
  return r ?? null;
}

/* ---------- Profit / loss = sold − costs ---------- */

export async function profitSummary(from: string | null, to: string | null) {
  const mw: SQL[] = [];
  const ew: SQL[] = [];
  if (from) {
    mw.push(gte(memos.date, from));
    ew.push(gte(expenses.date, from));
  }
  if (to) {
    mw.push(lte(memos.date, to));
    ew.push(lte(expenses.date, to));
  }
  const [[m], [e]] = await Promise.all([
    db
      .select({ sold: sumNum(memos.total), first: sql<string | null>`min(${memos.date})::text` })
      .from(memos)
      .where(mw.length ? and(...mw) : undefined),
    db
      .select({ costs: sumNum(expenses.amount), first: sql<string | null>`min(${expenses.date})::text` })
      .from(expenses)
      .where(ew.length ? and(...ew) : undefined),
  ]);
  const sold = Number(m.sold);
  const costs = Number(e.costs);
  const firsts = [m.first, e.first].filter(Boolean) as string[];
  return {
    sold,
    costs,
    profit: Math.round((sold - costs) * 100) / 100,
    firstDate: firsts.length ? firsts.sort()[0] : null,
  };
}

/* ---------- Report rows ---------- */

export async function reportData(from: string, to: string) {
  const memoRows = await db
    .select()
    .from(memos)
    .where(and(gte(memos.date, from), lte(memos.date, to)))
    .orderBy(asc(memos.date), asc(memos.id));
  const itemRows = memoRows.length
    ? await db
        .select()
        .from(memoItems)
        .where(
          inArray(
            memoItems.memoId,
            memoRows.map((m) => m.id),
          ),
        )
        .orderBy(asc(memoItems.id))
    : [];
  const withItems = memoRows.map((m) => ({ ...m, items: itemRows.filter((i) => i.memoId === m.id) }));

  const paymentRows = await db
    .select({
      id: payments.id,
      date: payments.date,
      amount: payments.amount,
      note: payments.note,
      memoId: payments.memoId,
      customerName: memos.customerName,
      phone: memos.phone,
    })
    .from(payments)
    .innerJoin(memos, eq(payments.memoId, memos.id))
    .where(and(gte(payments.date, from), lte(payments.date, to)))
    .orderBy(asc(payments.date), asc(payments.id));
  const expenseRows = await db
    .select()
    .from(expenses)
    .where(and(gte(expenses.date, from), lte(expenses.date, to)))
    .orderBy(asc(expenses.date), asc(expenses.id));

  const sales = withItems.reduce(
    (a, m) => ({ total: a.total + m.total, initialPaid: a.initialPaid + m.initialPaid, due: a.due + m.due }),
    { total: 0, initialPaid: 0, due: 0 },
  );
  const later = paymentRows.reduce((a, p) => a + p.amount, 0);
  const aman = expenseRows.filter((e) => e.person === "AMAN").reduce((a, e) => a + e.amount, 0);
  const rofiq = expenseRows.filter((e) => e.person === "ROFIQ").reduce((a, e) => a + e.amount, 0);

  return {
    memos: withItems,
    payments: paymentRows,
    expenses: expenseRows,
    summary: {
      memoCount: withItems.length,
      sales: sales.total,
      paidAtSale: sales.initialPaid,
      laterCollected: later,
      collected: sales.initialPaid + later,
      dueFromTheseMemos: sales.due,
      aman,
      rofiq,
    },
  };
}

/** Per-day rows for the report table */
export function dailyRows(data: Awaited<ReturnType<typeof reportData>>) {
  const byDay = new Map<string, { sales: number; cash: number; due: number; aman: number; rofiq: number }>();
  const row = (d: string) => {
    if (!byDay.has(d)) byDay.set(d, { sales: 0, cash: 0, due: 0, aman: 0, rofiq: 0 });
    return byDay.get(d)!;
  };
  for (const m of data.memos) {
    const x = row(m.date);
    x.sales += m.total;
    x.cash += m.initialPaid;
    x.due += m.due;
  }
  for (const p of data.payments) row(p.date).cash += p.amount;
  for (const e of data.expenses) row(e.date)[e.person === "AMAN" ? "aman" : "rofiq"] += e.amount;
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
