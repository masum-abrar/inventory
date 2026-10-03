"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Home, ReceiptText, HandCoins, Utensils, FileBarChart, Plus, LogOut, Languages, Loader2 } from "lucide-react";
import { logout } from "@/app/login/actions";
import { setLang } from "@/app/lang-action";
import { useT } from "./I18n";
import { InstallButton } from "./InstallApp";
import type { Key } from "@/lib/i18n/dict";

const links: { href: string; label: Key; long?: Key; icon: typeof Home }[] = [
  { href: "/", label: "nav.home", icon: Home },
  { href: "/sales", label: "nav.sales", icon: ReceiptText },
  { href: "/dues", label: "nav.dues", icon: HandCoins },
  { href: "/expenses/aman", label: "nav.aman", long: "nav.amanFood", icon: Utensils },
  { href: "/expenses/rofiq", label: "nav.rofiq", long: "nav.rofiqFood", icon: Utensils },
  { href: "/reports", label: "nav.reports", icon: FileBarChart },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

/** Switches between English and Bangla */
export function LangSwitch({ compact }: { compact?: boolean }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t("nav.languageLabel")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLang(lang === "en" ? "bn" : "en");
          router.refresh();
        })
      }
      className={
        compact
          ? "flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink"
          : "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted hover:bg-mist hover:text-ink"
      }
    >
      {pending ? <Loader2 size={compact ? 16 : 18} className="animate-spin" /> : <Languages size={compact ? 16 : 18} />}
      {t("nav.language")}
    </button>
  );
}

export function Sidebar() {
  const path = usePathname();
  const { t } = useT();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sm font-bold text-white">SH</span>
        <span className="text-lg font-bold tracking-tight">{t("appName")}</span>
      </Link>

      <Link href="/sales/new" className="btn btn-primary mb-6">
        <Plus size={18} /> {t("nav.newMemo")}
      </Link>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, long, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${
                active ? "bg-accent-soft text-accent" : "text-muted hover:bg-mist hover:text-ink"
              }`}
            >
              <Icon size={18} />
              {t(long ?? label)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <InstallButton />
        <LangSwitch />
        <form action={logout}>
          <button className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted hover:bg-mist hover:text-ink">
            <LogOut size={18} /> {t("nav.logout")}
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const { t } = useT();
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-mist/90 px-4 backdrop-blur lg:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-white">SH</span>
        <span className="truncate font-bold tracking-tight">{t("appName")}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <LangSwitch compact />
        <Link href="/reports" aria-label={t("nav.reports")} className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface">
          <FileBarChart size={20} />
        </Link>
        <form action={logout}>
          <button aria-label={t("nav.logout")} className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface">
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}

export function BottomBar() {
  const path = usePathname();
  const { t } = useT();
  const tabs = links.filter((l) => l.href !== "/reports");
  const hideFab = path.startsWith("/sales/new") || path.endsWith("/edit");
  return (
    <>
      {!hideFab && (
        <Link
          href="/sales/new"
          aria-label={t("nav.newMemo")}
          className="no-print fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-[0_8px_24px_-8px_rgba(46,107,91,0.6)] lg:hidden"
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
        >
          <Plus size={26} />
        </Link>
      )}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  active ? "text-accent" : "text-faint"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                {t(label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
