import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="panel w-full max-w-sm p-7 text-center">
        <h1 className="text-xl font-bold">{t("nf.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("nf.body")}</p>
        <Link href="/" className="btn btn-primary mt-5">
          {t("nf.home")}
        </Link>
      </div>
    </main>
  );
}
