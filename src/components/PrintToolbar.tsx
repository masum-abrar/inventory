"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { useT } from "./I18n";

/** Shows the print bar and opens the print dialog once the page is ready */
export function PrintToolbar({ title }: { title: string }) {
  const { t } = useT();
  useEffect(() => {
    document.title = title; // becomes the PDF file name
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [title]);

  return (
    <div className="no-print sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm text-muted">{t("print.hint")}</p>
        <button onClick={() => window.print()} className="btn btn-primary btn-sm shrink-0">
          <Printer size={16} /> {t("c.print")}
        </button>
      </div>
    </div>
  );
}
