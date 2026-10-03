import { notFound } from "next/navigation";
import { getMemo } from "@/lib/queries";
import { memoNo, niceDate, tk } from "@/lib/format";
import { shopInfo } from "@/lib/shop";
import { PrintToolbar } from "@/components/PrintToolbar";

export default async function PrintMemo({ params }: PageProps<"/print/memo/[id]">) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const memo = await getMemo(Number(id));
  if (!memo) notFound();
  const shop = shopInfo();
  const later = memo.payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="min-h-dvh bg-surface">
      <PrintToolbar title={`Memo ${memoNo(memo.id)} - ${memo.customerName}`} />
      <article className="figures mx-auto max-w-3xl px-6 py-10 text-[14px] print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
            {shop.address && <p className="mt-1 text-muted">{shop.address}</p>}
            {shop.phone && <p className="text-muted">{shop.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">Memo {memoNo(memo.id)}</p>
            <p className="text-muted">{niceDate(memo.date)}</p>
          </div>
        </header>

        <section className="mt-5">
          <p className="text-xs font-medium text-muted">Bill to</p>
          <p className="text-base font-semibold">{memo.customerName}</p>
          {memo.phone && <p>{memo.phone}</p>}
          {memo.address && <p className="text-muted">{memo.address}</p>}
        </section>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b border-ink text-left text-xs">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Product</th>
              <th className="py-2 pr-2 text-right font-semibold">Cartons</th>
              <th className="py-2 pr-2 text-right font-semibold">Per carton</th>
              <th className="py-2 pr-2 text-right font-semibold">Pieces</th>
              <th className="py-2 pr-2 text-right font-semibold">Per piece</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {memo.items.map((it, i) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-2 pr-2 text-muted">{i + 1}</td>
                <td className="py-2 pr-2">{it.productName}</td>
                <td className="py-2 pr-2 text-right">{it.cartons || "–"}</td>
                <td className="py-2 pr-2 text-right">{it.cartons ? tk(it.cartonPrice) : "–"}</td>
                <td className="py-2 pr-2 text-right">{it.pieces || "–"}</td>
                <td className="py-2 pr-2 text-right">{it.pieces ? tk(it.piecePrice) : "–"}</td>
                <td className="py-2 text-right font-medium">{tk(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-5 w-full max-w-xs space-y-1.5">
          <Row label="Total" value={tk(memo.total)} bold />
          <Row label="Paid" value={tk(memo.initialPaid)} />
          {memo.payments.map((p) => (
            <Row key={p.id} label={`Paid ${niceDate(p.date)}`} value={tk(p.amount)} />
          ))}
          <div className="border-t-2 border-ink pt-1.5">
            <Row label={memo.due > 0 ? "Due" : "Fully paid"} value={tk(memo.due)} bold />
          </div>
          {later > 0 && <p className="text-right text-xs text-muted">Total paid {tk(memo.paid)}</p>}
        </div>

        {memo.note && <p className="mt-6 whitespace-pre-wrap text-muted">Note: {memo.note}</p>}

        <footer className="mt-16 flex justify-between gap-8 text-xs text-muted">
          <p className="w-40 border-t border-muted pt-1 text-center">Customer signature</p>
          <p className="w-40 border-t border-muted pt-1 text-center">For {shop.name}</p>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
