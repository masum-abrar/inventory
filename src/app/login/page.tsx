"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { login, type LoginState } from "./actions";
import { useT } from "@/components/I18n";
import { LangSwitch } from "@/components/Nav";

export default function LoginPage() {
  const { t } = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="relative grid min-h-dvh place-items-center px-4">
      <div className="absolute right-4 top-4">
        <LangSwitch compact />
      </div>
      <form action={action} className="panel w-full max-w-sm p-7">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Lock size={22} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("appName")}</h1>
        <p className="mt-1 text-sm text-muted">{t("login.text")}</p>

        <label htmlFor="pin" className="field-label mt-6">
          {t("login.pin")}
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          required
          className="input figures text-center text-xl tracking-[0.4em]"
        />
        {state.error && (
          <p role="alert" className="mt-3 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary mt-5 w-full">
          {pending ? t("login.checking") : t("login.button")}
        </button>
      </form>
    </main>
  );
}
