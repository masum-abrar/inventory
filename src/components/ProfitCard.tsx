import { TrendingDown, TrendingUp } from "lucide-react";
import { tk } from "@/lib/format";
import type { T } from "@/lib/i18n/dict";

type Period = { label: string; sold: number; costs: number; profit: number };

/** Sold − Costs = Profit (green) or Loss (red), for one or more periods side by side */
export function ProfitCard({ t, periods, title }: { t: T; periods: Period[]; title?: string }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <h2 className="font-semibold">{title ?? t("profit.title")}</h2>
        <p className="text-xs text-muted">{t("profit.how")}</p>
      </div>
      <div className={`grid ${periods.length > 1 ? "grid-cols-2 divide-x divide-line" : ""}`}>
        {periods.map((p) => {
          const up = p.profit > 0;
          const down = p.profit < 0;
          return (
            <div key={p.label} className="min-w-0 p-4 sm:p-6">
              <p className="text-sm font-medium text-muted">{p.label}</p>
              <p
                className={`figures mt-1 flex items-center gap-1.5 truncate text-2xl font-bold tracking-tight sm:text-3xl ${
                  up ? "text-paid" : down ? "text-due" : ""
                }`}
              >
                {up && <TrendingUp size={22} className="shrink-0" />}
                {down && <TrendingDown size={22} className="shrink-0" />}
                {tk(Math.abs(p.profit))}
              </p>
              <p className={`text-sm font-semibold ${up ? "text-paid" : down ? "text-due" : "text-muted"}`}>
                {up ? t("profit.profit") : down ? t("profit.loss") : t("profit.even")}
              </p>
              <dl className="figures mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">{t("profit.sold")}</dt>
                  <dd className="truncate">{tk(p.sold)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">− {t("profit.costs")}</dt>
                  <dd className="truncate">{tk(p.costs)}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
