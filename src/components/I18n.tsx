"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Lang, type T } from "@/lib/i18n/dict";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "en", t: makeT("en") });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** const { t, lang } = useT(); t("nav.home") */
export function useT() {
  return useContext(Ctx);
}
