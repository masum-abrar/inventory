import Link from "next/link";
import { HandCoins, Plus, Utensils } from "lucide-react";
import { monthStartStr, niceDate, todayStr, tk } from "@/lib/format";
import { collectedBetween, expenseTotal, listMemos, memoTotals, profitSummary, totalOutstanding } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { MemoList } from "@/components/MemoList";
import { ProfitCard } from "@/components/ProfitCard";
import { InstallCard } from "@/components/InstallApp";

export default async function Home() {
  const { t, lang } = await getT();
  const today = todayStr();

  const [day, cash, outstanding, aman, rofiq, recent, month, ever] = await Promise.all([
    memoTotals(today, today),
    collectedBetween(today, today),
    totalOutstanding(),
    expenseTotal("AMAN", today, today),
    expenseTotal("ROFIQ", today, today),
    listMemos({ from: null, to: null, pageSize: 5 }),
    profitSummary(monthStartStr(), today),
    profitSummary(null, null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[15px] text-muted">{niceDate(today, lang)}</p>
        <h1 className="text-[26px] font-bold tracking-tight sm:text-3xl">{t("home.title")}</h1>
      </div>

      <InstallCard />

      {/* What do you want to do? */}
      <section className="grid grid-cols-3 gap-3">
        <Action href="/sales/new" icon={<Plus size={22} />} label={t("nav.newMemo")} primary />
        <Action href="/dues" icon={<HandCoins size={22} />} label={t("home.takeDue")} />
        <Action href="/expenses/aman" icon={<Utensils size={20} />} label={t("home.foodCost")} />
      </section>

      {/* Today in four numbers */}
      <section className="panel grid grid-cols-2">
        <Num href="/sales?range=today" label={t("home.soldToday")} value={tk(day.total)} sub={t("c.memos", { n: day.count })} />
        <Num
          label={t("home.cashToday")}
          value={tk(cash.total)}
          sub={cash.later > 0 ? t("home.fromOldDues", { amount: tk(cash.later) }) : t("home.fromTodaySales")}
          border
        />
        <Num
          href="/dues"
          label={t("home.owe")}
          value={tk(outstanding.due)}
          sub={t("c.customers", { n: outstanding.customers })}
          tone="due"
          top
        />
        <Num
          label={t("home.foodToday")}
          value={tk(aman + rofiq)}
          sub={t("home.foodSplit", { aman: tk(aman), rofiq: tk(rofiq) })}
          border
          top
        />
      </section>

      {/* Profit or loss */}
      <ProfitCard
        t={t}
        periods={[
          { label: t("c.thisMonth"), ...month },
          {
            label: ever.firstDate ? t("profit.sinceDate", { date: niceDate(ever.firstDate, lang) }) : t("profit.sinceStart"),
            ...ever,
          },
        ]}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.latest")}</h2>
          {recent.count > 0 && (
            <Link href="/sales?range=all" className="text-sm font-semibold text-accent">
              {t("c.seeAll")}
            </Link>
          )}
        </div>
        {recent.rows.length ? (
          <MemoList rows={recent.rows} />
        ) : (
          <div className="panel p-6">
            <p className="font-semibold">{t("home.startHere")}</p>
            <ol className="mt-3 space-y-2 text-[15px] text-muted">
              <li>1. {t("home.step1")}</li>
              <li>2. {t("home.step2")}</li>
              <li>3. {t("home.step3")}</li>
            </ol>
            <Link href="/sales/new" className="btn btn-primary mt-5">
              <Plus size={18} /> {t("home.firstMemo")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Action({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center text-sm font-semibold transition-colors ${
        primary ? "bg-accent text-white hover:bg-[#275c4e]" : "border border-line bg-surface text-ink hover:bg-mist"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Num({
  label,
  value,
  sub,
  href,
  tone,
  border,
  top,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: "due";
  border?: boolean;
  top?: boolean;
}) {
  const body = (
    <>
      <p className="truncate text-sm font-medium text-muted">{label}</p>
      <p className={`figures mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl ${tone === "due" ? "text-due" : ""}`}>{value}</p>
      {sub && <p className="figures mt-0.5 truncate text-xs text-muted sm:text-sm">{sub}</p>}
    </>
  );
  const cls = `block min-w-0 p-4 sm:p-6 ${border ? "border-l border-line" : ""} ${top ? "border-t border-line" : ""}`;
  return href ? (
    <Link href={href} className={`${cls} hover:bg-mist/50`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
