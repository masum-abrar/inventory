import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MemoForm } from "@/components/MemoForm";
import { PageHeader } from "@/components/ui";
import { getMemo, productNames } from "@/lib/queries";
import { memoNo } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Edit memo" };

export default async function EditMemoPage({ params }: PageProps<"/sales/[id]/edit">) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const [memo, names, { t }] = await Promise.all([getMemo(Number(id)), productNames(), getT()]);
  if (!memo) notFound();
  const later = memo.payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/sales/${memo.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> {t("form.backToMemo")}
      </Link>
      <PageHeader title={t("form.editTitle", { no: memoNo(memo.id) })} />
      <MemoForm
        memoId={memo.id}
        productNames={names}
        laterPayments={later}
        initial={{
          date: memo.date,
          customerName: memo.customerName,
          phone: memo.phone,
          address: memo.address,
          note: memo.note,
          paid: memo.paid,
          items: memo.items,
        }}
      />
    </div>
  );
}
