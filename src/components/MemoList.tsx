import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { memoNo, niceDateShort, tk } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { DueBadge } from "./ui";

type Row = {
  id: number;
  date: string;
  customerName: string;
  total: number;
  due: number;
  items: { productName: string; cartons: number; pieces: number }[];
};

export async function MemoList({ rows }: { rows: Row[] }) {
  const { t, lang } = await getT();
  return (
    <div className="panel ledger overflow-hidden">
      {rows.map((m) => {
        const products = m.items.map((i) => i.productName);
        const productText =
          products.length > 2 ? `${products.slice(0, 2).join(", ")} ${t("sales.more", { n: products.length - 2 })}` : products.join(", ");
        const [day, month] = niceDateShort(m.date, lang).split(" ");
        return (
          <Link key={m.id} href={`/sales/${m.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-mist/60 sm:px-5">
            <div className="figures w-11 shrink-0 text-center leading-tight">
              <p className="text-lg font-bold">{day}</p>
              <p className="text-xs text-muted">{month}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.customerName}</p>
              <p className="mt-0.5 truncate text-sm text-muted">
                <span className="figures">{memoNo(m.id)}</span> · {productText}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="figures font-semibold">{tk(m.total)}</p>
              <div className="mt-1">
                <DueBadge due={m.due} />
              </div>
            </div>
            <ChevronRight size={18} className="hidden shrink-0 text-faint sm:block" />
          </Link>
        );
      })}
    </div>
  );
}
