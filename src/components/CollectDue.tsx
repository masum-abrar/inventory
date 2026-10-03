"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addPayment, collectFromCustomer, type ActionResult } from "@/lib/actions";
import { todayStr, tk } from "@/lib/format";
import { useT } from "./I18n";

/**
 * "Take payment" form. Works for one memo (memoId) or for all of a
 * customer's dues (customerKey, oldest memo is cleared first).
 */
export function CollectForm({
  due,
  memoId,
  customerKey,
  onDone,
  compact,
}: {
  due: number;
  memoId?: number;
  customerKey?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const serverAction = memoId ? addPayment.bind(null, memoId) : collectFromCustomer.bind(null, customerKey!);
  // Toast right when the server answers; the form may be replaced by fresh data right after
  const action = async (prev: ActionResult, fd: FormData) => {
    const res = await serverAction(prev, fd);
    if (res.ok && res.message) toast.success(res.message);
    return res;
  };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  const [amount, setAmount] = useState(String(due));
  const [showDate, setShowDate] = useState(false);
  const handled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.ok) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className={compact ? "" : "panel p-4 sm:p-6"}>
      {!compact && (
        <>
          <h2 className="font-semibold">{t("pay.title")}</h2>
          <p className="figures mt-0.5 text-sm text-muted">{t("pay.dueNow", { amount: tk(due) })}</p>
        </>
      )}
      <div className={`flex gap-2 ${compact ? "" : "mt-4"}`}>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("pay.amount")}</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">৳</span>
          <input
            name="amount"
            className="input figures !pl-8 text-lg font-semibold"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            onFocus={(e) => e.target.select()}
            required
          />
        </label>
        <button disabled={pending} className="btn btn-primary shrink-0">
          {pending && <Loader2 size={18} className="animate-spin" />}
          {pending ? t("c.saving") : t("pay.save")}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {Number(amount) > 0 && Number(amount) < due && (
          <span className="figures text-muted">{t("pay.left", { amount: tk(due - Number(amount)) })}</span>
        )}
        {showDate ? (
          <input name="date" type="date" className="input !h-9 !w-auto text-sm" defaultValue={todayStr()} aria-label={t("c.date")} />
        ) : (
          <button type="button" onClick={() => setShowDate(true)} className="font-medium text-accent">
            {t("pay.otherDay")}
          </button>
        )}
      </div>

      {state.error && <p role="alert" className="mt-3 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">{state.error}</p>}
    </form>
  );
}

/** A due-list row button that opens the payment form underneath */
export function CollectToggle({ due, customerKey }: { due: number; customerKey: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
        {t("pay.title")}
      </button>
    );
  }
  return (
    <div className="w-full">
      <CollectForm compact due={due} customerKey={customerKey} onDone={() => setOpen(false)} />
      <button type="button" onClick={() => setOpen(false)} className="mt-2 text-sm font-medium text-muted hover:text-ink">
        {t("c.cancel")}
      </button>
    </div>
  );
}
