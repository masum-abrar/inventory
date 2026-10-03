"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { useT } from "@/components/I18n";

// Shown when a page can't load (no internet, database asleep or wrong link)
export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useT();
  return (
    <div className="panel mx-auto mt-6 max-w-md p-7 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-due-soft text-due">
        <WifiOff size={22} />
      </div>
      <h1 className="mt-4 text-xl font-bold">{t("pe.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("pe.body")}</p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-5">
        <RotateCw size={18} /> {t("pe.retry")}
      </button>
    </div>
  );
}
