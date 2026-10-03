import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, MapPin, Pencil, Phone, Printer } from "lucide-react";
import { getMemo } from "@/lib/queries";
import { memoNo, niceDate, tk } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { DeleteMemoButton, DeletePaymentButton } from "@/components/MemoActions";
import { CollectForm } from "@/components/CollectDue";
import { DownloadLink } from "@/components/DownloadLink";
import { FlashToast } from "@/components/ui";

export default async function MemoPage({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const [memo, { t, lang }] = await Promise.all([getMemo(Number(id)), getT()]);
  if (!memo) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <FlashToast param="saved" message={t("memo.saved")} />

      <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> {t("memo.allSales")}
      </Link>

      <div>
        <p className="figures text-sm text-muted">
          {t("c.memoNo", { no: memoNo(memo.id) })} · {niceDate(memo.date, lang)}
        </p>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight sm:text-3xl">{memo.customerName}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {memo.phone && (
            <a href={`tel:${memo.phone}`} className="figures inline-flex items-center gap-1.5 font-medium text-accent">
              <Phone size={15} /> {memo.phone}
            </a>
          )}
          {memo.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} /> {memo.address}
            </span>
          )}
        </div>
      </div>

      {/* The three numbers that matter */}
      <section className="panel grid grid-cols-3 divide-x divide-line">
        <Big label={t("c.total")} value={tk(memo.total)} />
        <Big label={t("c.paid")} value={tk(memo.paid)} />
        <Big label={t("c.due")} value={memo.due > 0 ? tk(memo.due) : t("c.none")} tone={memo.due > 0 ? "due" : "paid"} />
      </section>

      {memo.due > 0 && <CollectForm key={memo.due} memoId={memo.id} due={memo.due} />}

      {/* Products */}
      <section>
        <h2 className="mb-3 font-semibold">{t("memo.products")}</h2>
        <div className="panel ledger overflow-hidden">
          {memo.items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <p className="font-medium">{it.productName}</p>
                <div className="figures mt-0.5 space-y-0.5 text-sm text-muted">
                  {it.cartons > 0 && <p>{t("memo.cartons", { n: it.cartons, price: tk(it.cartonPrice) })}</p>}
                  {it.pieces > 0 && <p>{t("memo.pieces", { n: it.pieces, price: tk(it.piecePrice) })}</p>}
                </div>
              </div>
              <p className="figures shrink-0 font-semibold">{tk(it.lineTotal)}</p>
            </div>
          ))}
        </div>
      </section>

      {memo.note && (
        <section className="panel p-4 sm:p-5">
          <p className="text-xs font-medium text-muted">{t("c.note")}</p>
          <p className="mt-1 whitespace-pre-wrap">{memo.note}</p>
        </section>
      )}

      {/* Payment history */}
      {(memo.initialPaid > 0 || memo.payments.length > 0) && (
        <section>
          <h2 className="mb-3 font-semibold">{t("memo.payments")}</h2>
          <div className="panel ledger overflow-hidden">
            {memo.initialPaid > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <p className="flex-1 text-sm text-muted">
                  {niceDate(memo.date, lang)} · {t("memo.atSale")}
                </p>
                <p className="figures font-semibold text-paid">{tk(memo.initialPaid)}</p>
                <span className="w-9" />
              </div>
            )}
            {memo.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <p className="min-w-0 flex-1 truncate text-sm text-muted">
                  {niceDate(p.date, lang)}
                  {p.note ? ` · ${p.note}` : ""}
                </p>
                <p className="figures font-semibold text-paid">{tk(p.amount)}</p>
                <DeletePaymentButton id={p.id} memoId={memo.id} amount={p.amount} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-2 border-t border-line pt-5">
        <DownloadLink href={`/api/pdf/memo/${memo.id}`} className="btn btn-quiet btn-sm">
          <Download size={16} /> {t("c.downloadPdf")}
        </DownloadLink>
        <a href={`/print/memo/${memo.id}`} target="_blank" className="btn btn-quiet btn-sm">
          <Printer size={16} /> {t("c.print")}
        </a>
        <Link href={`/sales/${memo.id}/edit`} className="btn btn-quiet btn-sm">
          <Pencil size={16} /> {t("c.edit")}
        </Link>
        <DeleteMemoButton id={memo.id} />
      </section>
    </div>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "due" | "paid" }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      <p
        className={`figures mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl ${
          tone === "due" ? "text-due" : tone === "paid" ? "text-paid" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
