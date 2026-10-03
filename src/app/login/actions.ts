"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const realPin = process.env.APP_PIN;
  const { t } = await getT();

  if (!realPin) {
    return { error: t("login.noPin") };
  }
  if (!pin || !safeEqual(pin, realPin)) {
    // Small delay makes guessing PINs slow
    await new Promise((r) => setTimeout(r, 800));
    return { error: t("login.wrong") };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
