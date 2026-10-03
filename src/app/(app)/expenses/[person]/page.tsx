import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { expenseTotal, getExpense, listExpenses, pageFrom, resolveRange } from "@/lib/queries";
import { monthStartStr, niceDate, todayStr, tk } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { Empty, FlashToast, PageHeader } from "@/components/ui";
import { DeleteExpenseButton, ExpenseForm } from "@/components/ExpenseForm";
import { ListControls, Pager } from "@/components/ListControls";

const PEOPLE = {
  aman: { person: "AMAN" as const, name: "nav.aman" as const },
  rofiq: { person: "ROFIQ" as const, name: "nav.rofiq" as const },
};

const RANGES = [
  { key: "today", label: "c.today" as const },
  { key: "week", label: "c.thisWeek" as const },
  { key: "month", label: "c.thisMonth" as const },
  { key: "all", label: "c.allTime" as const },
];

export async function generateMetadata({ params }: PageProps<"/expenses/[person]">) {
  const p = PEOPLE[(await params).person as keyof typeof PEOPLE];
  return { title: p ? (p.person === "AMAN" ? "Aman's food" : "Rofiq's food") : "Food" };
}

export default async function ExpensePage({ params, searchParams }: PageProps<"/expenses/[person]">) {
  const slug = (await params).person as keyof typeof PEOPLE;
  const cfg = PEOPLE[slug];
  if (!cfg) notFound();
  const { t, lang } = await getT();
  const name = t(cfg.name);
  const sp = (await searchParams) as Record<string, string | undefined>;
  const r = resolveRange(sp, "month");
  const today = todayStr();

  const editId = Number(sp.edit || 0);
  const [list, todayTotal, monthTotal, editing] = await Promise.all([
    listExpenses(cfg.person, r.from, r.to, pageFrom(sp)),
    expenseTotal(cfg.person, today, today),
    expenseTotal(cfg.person, monthStartStr(), today),
    editId ? getExpense(editId) : Promise.resolve(null),
  ]);
  const editRow = editing && editing.person === cfg.person ? editing : null;

  // Group this page's rows by day
  const days = new Map<string, typeof list.rows>();
  for (const e of list.rows) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <>
      <FlashToast param="updated" message={t("exp.updated")} />
      <PageHeader title={t("exp.title", { name })} />

      {/* Switch between the two people */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1">
        {Object.entries(PEOPLE).map(([k, p]) => (
          <Link
            key={k}
            href={`/expenses/${k}`}
            aria-current={k === slug ? "page" : undefined}
            className={`flex h-9 items-center rounded-lg px-5 text-sm font-semibold ${
              k === slug ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {t(p.name)}
          </Link>
        ))}
      </div>

      <div className="panel mb-5 grid grid-cols-2 divide-x divide-line">
        <div className="p-5">
          <p className="text-sm font-medium text-muted">{t("c.today")}</p>
          <p className="figures mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{tk(todayTotal)}</p>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium text-muted">{t("c.thisMonth")}</p>
          <p className="figures mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{tk(monthTotal)}</p>
        </div>
      </div>

      <div className="mb-8">
        <ExpenseForm
          key={editRow?.id ?? "new"}
          person={cfg.person}
          name={name}
          editing={editRow && { id: editRow.id, date: editRow.date, item: editRow.item, amount: editRow.amount, note: editRow.note }}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t("exp.past")}</h2>
      <ListControls ranges={RANGES} activeRange={r.key} from={r.from} to={r.to}>
        {list.rows.length ? (
          <>
            <p className="figures mb-3 text-sm text-muted">{t("exp.totalDates", { amount: tk(list.sum) })}</p>
            <div className="space-y-4">
              {[...days.entries()].map(([day, rows]) => (
                <section key={day} className="panel overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-mist/50 px-4 py-2.5 text-sm sm:px-5">
                    <span className="font-medium">{day === today ? t("c.today") : niceDate(day, lang)}</span>
                    <span className="figures font-semibold">{tk(rows.reduce((a, e) => a + e.amount, 0))}</span>
                  </div>
                  <div className="ledger">
                    {rows.map((e) => (
                      <div key={e.id} className="flex items-center gap-1 px-4 py-2.5 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{e.item}</p>
                          {e.note && <p className="truncate text-sm text-muted">{e.note}</p>}
                        </div>
                        <p className="figures mr-2 shrink-0 font-semibold">{tk(e.amount)}</p>
                        <Link
                          href={`/expenses/${slug}?edit=${e.id}`}
                          aria-label={t("exp.change")}
                          className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-mist hover:text-ink"
                        >
                          <Pencil size={16} />
                        </Link>
                        <DeleteExpenseButton id={e.id} amount={e.amount} item={e.item} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <Pager page={list.page} pages={list.pages} count={list.count} noun="c.entries" />
          </>
        ) : (
          <Empty title={t("exp.empty")} body={t("exp.emptyBody", { name })} />
        )}
      </ListControls>
    </>
  );
}
