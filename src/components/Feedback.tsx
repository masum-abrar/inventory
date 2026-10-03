"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useT } from "./I18n";

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

/** const confirm = useConfirm(); if (await confirm({ title: "Delete?" })) ... */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((answer: boolean) => {
    resolver.current?.(answer);
    resolver.current = null;
    dialogRef.current?.close();
    setOpts(null);
  }, []);

  useEffect(() => {
    if (opts && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
      cancelRef.current?.focus();
    }
  }, [opts]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}

      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
        offset={24}
        mobileOffset={{ top: 64 }}
        style={{ zIndex: 60 }}
        toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "15px", borderRadius: "14px" } }}
      />

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close(false); // tap outside
        }}
        aria-labelledby="confirm-title"
        className="m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_64px_-24px_rgba(30,41,37,0.45)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        {opts && (
          <div className="p-6">
            {opts.danger && (
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-due-soft text-due">
                <AlertTriangle size={20} />
              </div>
            )}
            <h2 id="confirm-title" className="text-lg font-bold tracking-tight">
              {opts.title}
            </h2>
            {opts.body && <p className="mt-1.5 text-[15px] text-muted">{opts.body}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button ref={cancelRef} type="button" className="btn btn-quiet" onClick={() => close(false)}>
                {t("c.cancel")}
              </button>
              <button
                type="button"
                className={`btn ${opts.danger ? "bg-due text-white hover:bg-[#9d3c4d]" : "btn-primary"}`}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? t("c.delete")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmCtx.Provider>
  );
}
