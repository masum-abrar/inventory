"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "./I18n";

/**
 * Downloads a file (PDF / Excel) and shows a spinner while the server makes it.
 * If anything goes wrong, it falls back to opening the link normally.
 */
export function DownloadLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function download(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "download";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error(t("c.downloadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <a href={href} onClick={download} aria-busy={busy} className={`relative ${className ?? ""}`}>
      {children}
      {busy && (
        <span className="absolute inset-0 grid place-items-center rounded-[inherit] bg-surface/80 text-sm font-semibold text-accent">
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" /> {t("c.makingFile")}
          </span>
        </span>
      )}
    </a>
  );
}
