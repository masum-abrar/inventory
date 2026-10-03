import Link from "next/link";
import { Plus } from "lucide-react";
import { niceDate, tk } from "@/lib/format";
import { listMemos, pageFrom, resolveRange, type MemoStatus } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { MemoList } from "@/components/MemoList";
import { ListControls, Pager } from "@/components/ListControls";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Sales" };

const STATUSES = [
  { key: "all", label: "c.all" as const },
  { key: "due", label: "sales.hasDue" as const },
  { key: "paid", label: "sales.paidOnly" as const },
];

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const { t, lang } = await getT();
  const sp = (await searchParams) as Record<string, string | undefined>;
  const q = sp.q?.trim() || undefined;
  // When searching, look through all dates unless a date was picked
  const r = resolveRange(sp, q ? "all" : "today");
  const status: MemoStatus = sp.status === "due" || sp.status === "paid" ? sp.status : "all";
  const list = await listMemos({ from: r.from, to: r.to, q, status, page: pageFrom(sp) });

  const rangeText =
    r.from && r.to
      ? r.from === r.to
        ? niceDate(r.from, lang)
        : `${niceDate(r.from, lang)} – ${niceDate(r.to, lang)}`
      : t("c.allDates");

  return (
    <>
      <PageHeader
        title={t("sales.title")}
        sub={rangeText}
        action={
          <Link href="/sales/new" className="btn btn-primary hidden lg:inline-flex">
            <Plus size={18} /> {t("nav.newMemo")}
          </Link>
        }
      />

      <ListControls
        search={{ placeholder: "sales.searchPh" }}
        activeRange={r.key}
        from={r.from}
        to={r.to}
        statuses={STATUSES}
        activeStatus={status}
      >
        {list.count > 0 && (
          <div className="panel mb-4 grid grid-cols-3 divide-x divide-line">
            <Stat label={t("sales.soldCount", { n: list.count })} value={tk(list.sums.total)} />
            <Stat label={t("c.paid")} value={tk(list.sums.paid)} />
            <Stat label={t("c.due")} value={tk(list.sums.due)} tone={list.sums.due > 0 ? "due" : undefined} />
          </div>
        )}

        {list.rows.length ? (
          <>
            <MemoList rows={list.rows} />
            <Pager page={list.page} pages={list.pages} count={list.count} noun="c.memos" />
          </>
        ) : (
          <Empty
            title={q ? t("sales.notFound", { q }) : t("sales.noneOnDates")}
            body={q ? t("sales.notFoundBody") : t("sales.noneOnDatesBody")}
            href="/sales/new"
            cta={t("nav.newMemo")}
          />
        )}
      </ListControls>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "due" }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-5">
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className={`figures mt-0.5 truncate font-semibold sm:text-lg ${tone === "due" ? "text-due" : ""}`}>{value}</p>
    </div>
  );
}
