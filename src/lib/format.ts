// Shared helpers that are safe on both server and client.

export const TZ = "Asia/Dhaka";

const moneyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** 12345.5 -> "৳12,345.5" */
export function tk(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `৳${moneyFmt.format(round2(v))}`;
}

export function num(n: number | string | null | undefined) {
  return moneyFmt.format(Number(n ?? 0));
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Today's date in Bangladesh as YYYY-MM-DD */
export function todayStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function monthStartStr() {
  return todayStr().slice(0, 8) + "01";
}

/** Monday-based week start */
export function weekStartStr() {
  const t = todayStr();
  const day = new Date(t + "T00:00:00Z").getUTCDay(); // 0 Sun
  const back = (day + 6) % 7;
  return addDays(t, -back);
}

export function addDays(ymd: string, days: number) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলাই", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

function parts(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

/** "2026-10-03" -> "3 Oct 2026" (or "3 অক্টোবর 2026") */
export function niceDate(ymd: string, lang: "en" | "bn" = "en") {
  if (lang === "bn") {
    const { y, m, d } = parts(ymd);
    return `${d} ${BN_MONTHS[m - 1]} ${y}`;
  }
  const dt = new Date(ymd + "T00:00:00Z");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "2026-10-03" -> "3 Oct" */
export function niceDateShort(ymd: string, lang: "en" | "bn" = "en") {
  if (lang === "bn") {
    const { m, d } = parts(ymd);
    return `${d} ${BN_SHORT[m - 1]}`;
  }
  const dt = new Date(ymd + "T00:00:00Z");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function memoNo(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}
