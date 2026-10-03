"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useT } from "./I18n";
import type { Key } from "@/lib/i18n/dict";

type Option = { key: string; label: Key };

export const DATE_RANGES: Option[] = [
  { key: "today", label: "c.today" },
  { key: "yesterday", label: "c.yesterday" },
  { key: "week", label: "c.thisWeek" },
  { key: "month", label: "c.thisMonth" },
  { key: "all", label: "c.allTime" },
];

/**
 * Search (as you type), date chips, custom dates and status chips.
 * Everything lives in the URL, so the page can be refreshed or shared.
 * While new results load, the list below is dimmed and a bar runs at the top.
 */
export function ListControls({
  children,
  search,
  ranges = DATE_RANGES,
  activeRange,
  from,
  to,
  statuses,
  activeStatus,
}: {
  children: ReactNode;
  search?: { placeholder: Key };
  ranges?: Option[] | null;
  activeRange?: string;
  from?: string | null;
  to?: string | null;
  statuses?: Option[];
  activeStatus?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [showDates, setShowDates] = useState(activeRange === "custom");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // any filter change starts from page 1
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  function onType(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: value.trim() || null }), 350);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <>
      {pending && <TopBar />}

      <div className="mb-4 space-y-3">
        {search && (
          <div className="relative">
            {pending ? (
              <Loader2 size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-accent" />
            ) : (
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            )}
            <input
              type="search"
              value={q}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (timer.current) clearTimeout(timer.current);
                  go({ q: q.trim() || null });
                }
              }}
              placeholder={t(search.placeholder)}
              aria-label={t("c.search")}
              className="input !pl-10 !pr-11 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                aria-label={t("c.clearSearch")}
                onClick={() => {
                  setQ("");
                  if (timer.current) clearTimeout(timer.current);
                  go({ q: null });
                }}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-faint hover:bg-mist hover:text-ink"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {ranges && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
            {ranges.map((r) => (
              <button
                key={r.key}
                type="button"
                data-active={activeRange === r.key}
                className="chip"
                onClick={() => {
                  setShowDates(false);
                  go({ range: r.key, from: null, to: null });
                }}
              >
                {t(r.label)}
              </button>
            ))}
            <button
              type="button"
              data-active={activeRange === "custom" || showDates}
              className="chip gap-1.5"
              onClick={() => setShowDates((v) => !v)}
            >
              <CalendarDays size={15} /> {t("c.pickDates")}
            </button>
          </div>
        )}

        {ranges && showDates && (
          <div className="panel grid grid-cols-2 gap-3 p-3">
            <label className="text-xs font-medium text-muted">
              {t("c.from")}
              <input
                type="date"
                className="input mt-1 !h-11"
                defaultValue={activeRange === "custom" ? from ?? "" : ""}
                onChange={(e) => e.target.value && go({ range: "custom", from: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-muted">
              {t("c.to")}
              <input
                type="date"
                className="input mt-1 !h-11"
                defaultValue={activeRange === "custom" ? to ?? "" : ""}
                onChange={(e) => e.target.value && go({ range: "custom", to: e.target.value })}
              />
            </label>
          </div>
        )}

        {statuses && (
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {statuses.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={activeStatus === s.key}
                onClick={() => go({ status: s.key === "all" ? null : s.key })}
                className={`h-8 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                  activeStatus === s.key ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
                }`}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>
        {children}
      </div>
    </>
  );
}

/** Previous / Next page buttons */
export function Pager({ page, pages, count, noun }: { page: number; pages: number; count: number; noun: Key }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<number | null>(null);

  if (pages <= 1) {
    return <p className="mt-4 text-center text-sm text-muted">{t(noun, { n: count })}</p>;
  }

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setTarget(p);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <>
      {pending && <TopBar />}
      <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={page <= 1 || pending} onClick={() => goTo(page - 1)} className="btn btn-quiet btn-sm">
          {pending && target === page - 1 ? <Loader2 size={16} className="animate-spin" /> : <ChevronLeft size={16} />} {t("c.previous")}
        </button>
        <p className="figures text-center text-sm text-muted">
          {t("c.pageOf", { page, pages })}
          <span className="hidden sm:inline"> · {t(noun, { n: count })}</span>
        </p>
        <button type="button" disabled={page >= pages || pending} onClick={() => goTo(page + 1)} className="btn btn-quiet btn-sm">
          {t("c.next")} {pending && target === page + 1 ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
        </button>
      </nav>
    </>
  );
}

export function TopBar() {
  const { t } = useT();
  return (
    <div className="no-print fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden bg-accent-soft" role="progressbar" aria-label={t("c.loading")}>
      <div className="h-full w-1/3 animate-[loadbar_1s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}
