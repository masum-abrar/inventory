import { reportData } from "@/lib/queries";
import { isYmd, memoNo, niceDate, niceDateShort, todayStr, tk } from "@/lib/format";
import { shopInfo } from "@/lib/shop";
import { PrintToolbar } from "@/components/PrintToolbar";

export default async function PrintReport({ searchParams }: PageProps<"/print/report">) {
  const sp = (await searchParams) as Record<string, string | undefined>;
  const from = isYmd(sp.from) ? sp.from : todayStr();
  const to = isYmd(sp.to) ? sp.to : from;
  const data = await reportData(from, to);
  const s = data.summary;
  const shop = shopInfo();
  const period = from === to ? niceDate(from) : `${niceDate(from)} – ${niceDate(to)}`;

  return (
    <div className="min-h-dvh bg-surface">
      <PrintToolbar title={`Report ${from}${from === to ? "" : ` to ${to}`}`} />
      <article className="figures mx-auto max-w-4xl px-6 py-10 text-[13px] print:px-0 print:py-0">
        <header className="border-b-2 border-ink pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{shop.name} · Report</h1>
          <p className="text-muted">{period}</p>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 print:grid-cols-3">
          <Kv label="Sales" value={tk(s.sales)} />
          <Kv label="Cash received" value={tk(s.collected)} />
          <Kv label="Still due on these memos" value={tk(s.dueFromTheseMemos)} />
          <Kv label="Memos" value={String(s.memoCount)} />
          <Kv label="Old dues collected" value={tk(s.laterCollected)} />
          <Kv label="Food (Aman + Rofiq)" value={`${tk(s.aman)} + ${tk(s.rofiq)}`} />
        </section>

        <h2 className="mt-8 text-base font-bold">Sales</h2>
        <div className="overflow-x-auto print:overflow-visible">
        <table className="mt-2 w-full min-w-[620px] border-collapse print:min-w-0">
          <thead>
            <tr className="border-b border-ink text-left text-xs">
              <th className="py-1.5 pr-2">Date</th>
              <th className="py-1.5 pr-2">Memo</th>
              <th className="py-1.5 pr-2">Customer</th>
              <th className="py-1.5 pr-2">Products</th>
              <th className="py-1.5 pr-2 text-right">Total</th>
              <th className="py-1.5 pr-2 text-right">Paid</th>
              <th className="py-1.5 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {data.memos.map((m) => (
              <tr key={m.id} className="break-inside-avoid border-b border-line align-top">
                <td className="py-1.5 pr-2 whitespace-nowrap">{niceDateShort(m.date)}</td>
                <td className="py-1.5 pr-2">{memoNo(m.id)}</td>
                <td className="py-1.5 pr-2">
                  {m.customerName}
                  {m.phone && <span className="block text-xs text-muted">{m.phone}</span>}
                </td>
                <td className="py-1.5 pr-2">
                  {m.items.map((i) => (
                    <span key={i.id} className="block">
                      {i.productName}{" "}
                      <span className="text-muted">
                        {[i.cartons ? `${i.cartons} ctn` : "", i.pieces ? `${i.pieces} pcs` : ""].filter(Boolean).join(" + ")}
                      </span>
                    </span>
                  ))}
                </td>
                <td className="py-1.5 pr-2 text-right">{tk(m.total)}</td>
                <td className="py-1.5 pr-2 text-right">{tk(m.paid)}</td>
                <td className="py-1.5 text-right">{tk(m.due)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={4} className="py-2">Total</td>
              <td className="py-2 pr-2 text-right">{tk(s.sales)}</td>
              <td className="py-2 pr-2 text-right">{tk(data.memos.reduce((a, m) => a + m.paid, 0))}</td>
              <td className="py-2 text-right">{tk(s.dueFromTheseMemos)}</td>
            </tr>
          </tbody>
        </table>
        </div>
        {!data.memos.length && <p className="py-3 text-muted">No sales in this period.</p>}

        {data.payments.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-bold">Old dues collected</h2>
            <table className="mt-2 w-full border-collapse">
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{niceDateShort(p.date)}</td>
                    <td className="py-1.5 pr-2">{memoNo(p.memoId)}</td>
                    <td className="py-1.5 pr-2">{p.customerName}</td>
                    <td className="py-1.5 text-right">{tk(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-8 grid gap-8 sm:grid-cols-2 print:grid-cols-2">
          {(["AMAN", "ROFIQ"] as const).map((person) => {
            const rows = data.expenses.filter((e) => e.person === person);
            return (
              <section key={person} className="break-inside-avoid">
                <h2 className="text-base font-bold">{person === "AMAN" ? "Aman" : "Rofiq"}&apos;s food</h2>
                <table className="mt-2 w-full border-collapse">
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id} className="border-b border-line">
                        <td className="py-1.5 pr-2 whitespace-nowrap">{niceDateShort(e.date)}</td>
                        <td className="py-1.5 pr-2">{e.item}</td>
                        <td className="py-1.5 text-right">{tk(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={2} className="py-2">Total</td>
                      <td className="py-2 text-right">{tk(rows.reduce((a, e) => a + e.amount, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      </article>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
