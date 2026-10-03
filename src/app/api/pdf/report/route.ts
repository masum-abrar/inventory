import { reportData } from "@/lib/queries";
import { reportPdf } from "@/lib/pdf";
import { isYmd, todayStr } from "@/lib/format";

export async function GET(req: Request) {
  const url = new URL(req.url);
  let from = isYmd(url.searchParams.get("from")) ? url.searchParams.get("from")! : todayStr();
  let to = isYmd(url.searchParams.get("to")) ? url.searchParams.get("to")! : from;
  if (from > to) [from, to] = [to, from];

  const pdf = await reportPdf(await reportData(from, to), from, to);
  const file = from === to ? `shop-report-${from}.pdf` : `shop-report-${from}-to-${to}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
