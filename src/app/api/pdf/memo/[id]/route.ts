import { getMemo } from "@/lib/queries";
import { memoPdf } from "@/lib/pdf";
import { memoNo } from "@/lib/format";

export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/memo/[id]">) {
  const { id } = await ctx.params;
  if (!Number.isInteger(Number(id))) return new Response("Not found", { status: 404 });
  const memo = await getMemo(Number(id));
  if (!memo) return new Response("Memo not found", { status: 404 });

  const pdf = await memoPdf(memo);
  const safeName = memo.customerName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "customer";
  const file = `memo-${memoNo(memo.id).slice(1)}-${safeName}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
