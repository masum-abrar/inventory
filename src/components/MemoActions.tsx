"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMemo, deletePayment } from "@/lib/actions";
import { tk } from "@/lib/format";
import { useConfirm } from "./Feedback";
import { useT } from "./I18n";

export function DeleteMemoButton({ id }: { id: number }) {
  const { t } = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-danger btn-sm"
      onClick={async () => {
        const ok = await confirm({ title: t("memo.deleteTitle"), body: t("memo.deleteBody"), danger: true });
        if (!ok) return;
        start(async () => {
          try {
            const res = await deleteMemo(id);
            if (res.message) toast.success(res.message);
            router.push("/sales");
          } catch {
            toast.error(t("err.generic"));
          }
        });
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      {pending ? t("c.deleting") : t("c.delete")}
    </button>
  );
}

export function DeletePaymentButton({ id, memoId, amount }: { id: number; memoId: number; amount: number }) {
  const { t } = useT();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t("memo.removePayment")}
      disabled={pending}
      className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-due-soft hover:text-due"
      onClick={async () => {
        const ok = await confirm({
          title: t("memo.removePaymentTitle"),
          body: t("memo.removePaymentBody", { amount: tk(amount) }),
          confirmLabel: t("memo.removePayment"),
          danger: true,
        });
        if (!ok) return;
        start(async () => {
          try {
            const res = await deletePayment(id, memoId);
            if (res.error) toast.error(res.error);
            else if (res.message) toast.success(res.message);
          } catch {
            toast.error(t("err.generic"));
          }
        });
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
    </button>
  );
}
