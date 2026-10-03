import Link from "next/link";
import { Phone } from "lucide-react";
import { duesByCustomer, pageFrom } from "@/lib/queries";
import { niceDate, tk } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { Empty, PageHeader } from "@/components/ui";
import { ListControls, Pager } from "@/components/ListControls";
import { CollectToggle } from "@/components/CollectDue";

export const metadata = { title: "Dues" };

export default async function DuesPage({ searchParams }: PageProps<"/dues">) {
  const { t, lang } = await getT();
  const sp = (await searchParams) as Record<string, string | undefined>;
  const q = sp.q?.trim() || undefined;
  const list = await duesByCustomer({ q, page: pageFrom(sp) });

  return (
    <>
      <PageHeader title={t("dues.title")} sub={t("dues.sub")} />

      <div className="panel mb-5 p-5">
        <p className="text-sm font-medium text-muted">{q ? t("dues.forSearch") : t("dues.owe")}</p>
        <p className="figures mt-1 text-4xl font-bold tracking-tight text-due">{tk(list.totalDue)}</p>
        <p className="mt-1 text-sm text-muted">{t("c.customers", { n: list.count })}</p>
      </div>

      <ListControls search={{ placeholder: "dues.searchPh" }} ranges={null}>
        {list.rows.length ? (
          <>
            <div className="panel ledger overflow-hidden">
              {list.rows.map((r) => {
                const seeMemos = `/sales?range=all&status=due&q=${encodeURIComponent(r.phone || r.customerName)}`;
                return (
                  <div key={r.key} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{r.customerName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="figures inline-flex items-center gap-1 font-medium text-accent">
                              <Phone size={14} /> {r.phone}
                            </a>
                          )}
                          <Link href={seeMemos} className="underline decoration-line underline-offset-4 hover:text-ink">
                            {t("c.memos", { n: r.memoCount })}, {t("dues.since", { date: niceDate(r.oldest, lang) })}
                          </Link>
                        </p>
                      </div>
                      <p className="figures shrink-0 text-lg font-bold text-due">{tk(r.due)}</p>
                    </div>
                    <div className="mt-3 flex">
                      <CollectToggle key={r.due} due={r.due} customerKey={r.key} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Pager page={list.page} pages={list.pages} count={list.count} noun="c.customers" />
          </>
        ) : (
          <Empty title={q ? t("dues.notFound", { q }) : t("dues.none")} body={q ? t("sales.notFoundBody") : undefined} />
        )}
      </ListControls>
    </>
  );
}
