import { FileSpreadsheet, FileText } from "lucide-react";
import { dailyRows, reportData, resolveRange } from "@/lib/queries";
import { niceDate, niceDateShort, todayStr, tk } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { ListControls } from "@/components/ListControls";
import { DownloadLink } from "@/components/DownloadLink";
import { ProfitCard } from "@/components/ProfitCard";

export const metadata = { title: "Reports" };

const RANGES = [
  { key: "today", label: "c.today" as const },
  { key: "yesterday", label: "c.yesterday" as const },
  { key: "week", label: "c.thisWeek" as const },
  { key: "month", label: "c.thisMonth" as const },
];

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { t, lang } = await getT();
  const sp = (await searchParams) as Record<string, string | undefined>;
  const r = resolveRange(sp, "month");
  const from = r.from ?? todayStr();
  const to = r.to ?? todayStr();
  const data = await reportData(from, to);
  const s = data.summary;
  const costs = s.aman + s.rofiq;
  const days = dailyRows(data).reverse();
  const qs = `from=${from}&to=${to}`;
  const period = from === to ? niceDate(from, lang) : `${niceDate(from, lang)} – ${niceDate(to, lang)}`;

  return (
    <>
      <PageHeader title={t("rep.title")} sub={period} />

      <ListControls ranges={RANGES} activeRange={r.key} from={from} to={to}>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <DownloadLink href={`/api/pdf/report?${qs}`} className="panel flex items-center gap-3 p-4 transition-colors hover:border-accent/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-due-soft text-due">
              <FileText size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{t("c.downloadPdf")}</span>
              <span className="block truncate text-xs text-muted sm:text-sm">{t("rep.pdfSub")}</span>
            </span>
          </DownloadLink>
          <DownloadLink href={`/api/export?${qs}`} className="panel flex items-center gap-3 p-4 transition-colors hover:border-accent/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paid-soft text-paid">
              <FileSpreadsheet size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{t("c.downloadExcel")}</span>
              <span className="block truncate text-xs text-muted sm:text-sm">{t("rep.excelSub")}</span>
            </span>
          </DownloadLink>
        </div>

        <div className="mb-5">
          <ProfitCard
            t={t}
            title={t("rep.profitLoss")}
            periods={[{ label: period, sold: s.sales, costs, profit: Math.round((s.sales - costs) * 100) / 100 }]}
          />
        </div>

        <section className="panel mb-5 grid grid-cols-2 sm:grid-cols-3">
          <Cell label={t("rep.sold")} value={tk(s.sales)} sub={t("c.memos", { n: s.memoCount })} />
          <Cell
            label={t("rep.cash")}
            value={tk(s.collected)}
            sub={s.laterCollected ? t("home.fromOldDues", { amount: tk(s.laterCollected) }) : undefined}
          />
          <Cell label={t("rep.dueLeft")} value={tk(s.dueFromTheseMemos)} tone="due" />
          <Cell label={t("rep.aman")} value={tk(s.aman)} />
          <Cell label={t("rep.rofiq")} value={tk(s.rofiq)} />
          <Cell label={t("rep.food")} value={tk(costs)} />
        </section>

        <h2 className="mb-3 text-lg font-semibold">{t("rep.daily")}</h2>
        {days.length ? (
          <div className="panel overflow-x-auto">
            <table className="figures w-full min-w-[600px] text-[15px]">
              <thead>
                <tr className="border-b border-line bg-mist/50 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">{t("c.date")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("rep.sold")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("rep.cashIn")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("c.due")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("nav.aman")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("nav.rofiq")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("rep.profitLoss")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {days.map(([d, x]) => {
                  const p = x.sales - x.aman - x.rofiq;
                  return (
                    <tr key={d}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{niceDateShort(d, lang)}</td>
                      <td className="px-4 py-3 text-right">{tk(x.sales)}</td>
                      <td className="px-4 py-3 text-right">{tk(x.cash)}</td>
                      <td className={`px-4 py-3 text-right ${x.due > 0 ? "text-due" : "text-faint"}`}>{tk(x.due)}</td>
                      <td className="px-4 py-3 text-right">{tk(x.aman)}</td>
                      <td className="px-4 py-3 text-right">{tk(x.rofiq)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${p > 0 ? "text-paid" : p < 0 ? "text-due" : "text-faint"}`}>
                        {p < 0 ? "−" : ""}
                        {tk(Math.abs(p))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel px-6 py-10 text-center text-muted">{t("rep.nothing")}</div>
        )}
      </ListControls>
    </>
  );
}

function Cell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "due" }) {
  return (
    <div className="min-w-0 border-b border-r border-line p-4 sm:p-5">
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className={`figures mt-1 truncate text-xl font-bold tracking-tight ${tone === "due" ? "text-due" : ""}`}>{value}</p>
      {sub && <p className="figures mt-0.5 truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}
