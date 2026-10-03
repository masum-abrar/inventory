"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "./I18n";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "shop-install-dismissed";

/** Runs before the app loads and keeps the browser's install offer for later */
export const EARLY_INSTALL_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__bip=e;window.dispatchEvent(new Event("bip-ready"))});`;

/** Registers the service worker (production only, so development stays simple) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

function useInstall() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // assume installed until we know
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));

    // The browser's install offer is caught by a tiny script in <head> (see
    // EARLY_INSTALL_SCRIPT) because it can arrive before this component exists.
    const w = window as unknown as { __bip?: PromptEvent };
    if (w.__bip) setPrompt(w.__bip);
    const onReady = () => setPrompt(w.__bip ?? null);
    const onInstalled = () => {
      w.__bip = undefined;
      setPrompt(null);
      setStandalone(true);
    };
    window.addEventListener("bip-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return { prompt, setPrompt, standalone, ios, canInstall: !standalone && (prompt !== null || ios) };
}

/** Card on the home page: "Install as an app" */
export function InstallCard() {
  const { t } = useT();
  const { prompt, setPrompt, ios, canInstall } = useInstall();
  const [hidden, setHidden] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (!canInstall || hidden) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      (window as unknown as { __bip?: PromptEvent }).__bip = undefined;
      setPrompt(null);
      if (outcome === "accepted") toast.success(t("install.done"));
    } else if (ios) {
      dialogRef.current?.showModal();
    }
  }

  function later() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <>
      <section className="panel flex items-center gap-4 p-4 sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("install.title")}</p>
          <p className="text-sm text-muted">{t("install.body")}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={install} className="btn btn-primary btn-sm">
              <Download size={16} /> {t("install.button")}
            </button>
            <button type="button" onClick={later} className="btn btn-quiet btn-sm">
              {t("install.later")}
            </button>
          </div>
        </div>
      </section>

      {/* iPhone has no install button, so explain the 3 taps */}
      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">{t("install.iosTitle")}</h2>
            <button type="button" aria-label={t("c.close")} onClick={() => dialogRef.current?.close()} className="text-muted">
              <X size={20} />
            </button>
          </div>
          <ol className="mt-4 space-y-3 text-[15px]">
            <li className="flex gap-3">
              <Step n={1} />
              <span>
                {t("install.ios1")} <Share size={16} className="inline align-[-2px] text-accent" />
              </span>
            </li>
            <li className="flex gap-3">
              <Step n={2} />
              <span>{t("install.ios2")}</span>
            </li>
            <li className="flex gap-3">
              <Step n={3} />
              <span>{t("install.ios3")}</span>
            </li>
          </ol>
          <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-primary mt-6 w-full">
            {t("install.ok")}
          </button>
        </div>
      </dialog>
    </>
  );
}

/** Small button for the desktop side menu */
export function InstallButton() {
  const { t } = useT();
  const { prompt, setPrompt, canInstall } = useInstall();
  if (!canInstall || !prompt) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        (window as unknown as { __bip?: PromptEvent }).__bip = undefined;
        setPrompt(null);
        if (outcome === "accepted") toast.success(t("install.done"));
      }}
      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-accent hover:bg-accent-soft"
    >
      <Download size={18} /> {t("install.button")}
    </button>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="figures grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
      {n}
    </span>
  );
}
