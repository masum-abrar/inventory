"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { tk } from "@/lib/format";
import { useT } from "./I18n";

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function DueBadge({ due }: { due: number }) {
  const { t } = useT();
  if (due > 0) {
    return (
      <span className="figures inline-flex h-6 items-center whitespace-nowrap rounded-full bg-due-soft px-2.5 text-xs font-semibold text-due">
        {t("c.dueAmount", { amount: tk(due) })}
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-paid-soft px-2.5 text-xs font-semibold text-paid">
      {t("c.paidBadge")}
    </span>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body?: string; href?: string; cta?: string }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {href && cta && (
        <Link href={href} className="btn btn-primary btn-sm mt-5">
          {cta}
        </Link>
      )}
    </div>
  );
}

/**
 * Shows a toast once when ?param=1 is in the URL (e.g. after a save that
 * moved to a new page), then removes the param so a refresh doesn't repeat it.
 */
export function FlashToast({ param, message }: { param: string; message: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  const on = params.get(param) === "1";

  useEffect(() => {
    if (!on || shown.current) return;
    shown.current = true;
    toast.success(message);
    const next = new URLSearchParams(params.toString());
    next.delete(param);
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [on, message, param, params, pathname, router]);

  return null;
}
