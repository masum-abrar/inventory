"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense, saveExpense, type ActionResult } from "@/lib/actions";
import { todayStr, tk } from "@/lib/format";
import { useConfirm } from "./Feedback";
import { useT } from "./I18n";
import type { Key } from "@/lib/i18n/dict";

const QUICK: Key[] = ["q.breakfast", "q.lunch", "q.dinner", "q.snacks"];

export function ExpenseForm({
  person,
  name,
  editing,
}: {
  person: "AMAN" | "ROFIQ";
  name: string;
  editing?: { id: number; date: string; item: string; amount: number; note: string } | null;
}) {
  const { t } = useT();
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev: ActionResult, fd: FormData) => {
    const res = await saveExpense(prev, fd);
    if (res.ok && res.message) toast.success(res.message);
    return res;
  }, {});
  const [item, setItem] = useState(editing?.item ?? "");
  const [showMore, setShowMore] = useState(Boolean(editing));
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const handled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok && !editing) {
      formRef.current?.reset();
      setItem("");
    }
  }, [state, editing]);

  return (
    <form ref={formRef} action={action} className="panel p-4 sm:p-6">
      <h2 className="font-semibold">{editing ? t("exp.editTitle") : t("exp.addTitle", { name })}</h2>
      <input type="hidden" name="person" value={person} />
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <p className="mt-3 text-sm text-muted">{t("exp.what")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK.map((k) => {
          const label = t(k);
          return (
            <button
              key={k}
              type="button"
              data-active={item === label}
              className="chip"
              onClick={() => {
                setItem(label);
                amountRef.current?.focus();
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-2">
        <input
          aria-label={t("exp.what")}
          name="item"
          className="input"
          placeholder={t("exp.whatPh")}
          value={item}
          onChange={(e) => setItem(e.target.value)}
          required
          autoComplete="off"
        />
        <label className="relative">
          <span className="sr-only">{t("exp.taka")}</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">৳</span>
          <input
            ref={amountRef}
            name="amount"
            className="input figures !pl-8 font-semibold"
            inputMode="decimal"
            placeholder={t("exp.taka")}
            defaultValue={editing?.amount ?? ""}
            required
          />
        </label>
      </div>

      {showMore ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-muted">
            {t("c.date")}
            <input name="date" type="date" className="input mt-1" defaultValue={editing?.date ?? todayStr()} required />
          </label>
          <label className="text-xs font-medium text-muted">
            {t("c.note")}
            <input name="note" className="input mt-1" placeholder={t("c.optional")} defaultValue={editing?.note ?? ""} />
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="date" value={todayStr()} />
          <button type="button" onClick={() => setShowMore(true)} className="mt-2 text-sm font-medium text-accent">
            {t("exp.more")}
          </button>
        </>
      )}

      {state.error && <p role="alert" className="mt-3 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">{state.error}</p>}

      <div className="mt-4 flex gap-2">
        {editing && (
          <Link href={`/expenses/${person.toLowerCase()}`} className="btn btn-quiet">
            {t("c.cancel")}
          </Link>
        )}
        <button disabled={pending} className="btn btn-primary flex-1 sm:flex-none sm:px-8">
          {pending && <Loader2 size={18} className="animate-spin" />}
          {pending ? t("c.saving") : editing ? t("c.saveChanges") : t("c.save")}
        </button>
      </div>
    </form>
  );
}

export function DeleteExpenseButton({ id, amount, item }: { id: number; amount: number; item: string }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t("c.delete")}
      disabled={pending}
      className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-due-soft hover:text-due"
      onClick={async () => {
        const ok = await confirm({
          title: t("exp.deleteTitle"),
          body: t("exp.deleteBody", { item, amount: tk(amount) }),
          danger: true,
        });
        if (!ok) return;
        start(async () => {
          try {
            const res = await deleteExpense(id);
            if (res.message) toast.success(res.message);
          } catch {
            toast.error(t("err.generic"));
          }
        });
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  );
}
