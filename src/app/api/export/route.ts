import ExcelJS from "exceljs";
import { isYmd, todayStr } from "@/lib/format";
import { reportData } from "@/lib/queries";

const MONEY = '"৳"#,##0.00';
const GREEN = "FF2E6B5B";

function styleHeader(ws: ExcelJS.Worksheet) {
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  h.alignment = { vertical: "middle" };
  h.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function totalRow(ws: ExcelJS.Worksheet, values: Record<string, unknown>) {
  const r = ws.addRow(values);
  r.font = { bold: true };
  r.border = { top: { style: "thin", color: { argb: "FF9AA6A1" } } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = isYmd(url.searchParams.get("from")) ? url.searchParams.get("from")! : todayStr();
  const to = isYmd(url.searchParams.get("to")) ? url.searchParams.get("to")! : from;
  const data = await reportData(from, to);
  const s = data.summary;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Shop Hisab";
  wb.created = new Date();

  /* Summary */
  const sum = wb.addWorksheet("Summary");
  sum.columns = [
    { header: "Item", key: "k", width: 32 },
    { header: "Amount", key: "v", width: 18, style: { numFmt: MONEY } },
  ];
  styleHeader(sum);
  sum.addRows([
    { k: "Period", v: from === to ? from : `${from} to ${to}` },
    { k: "Number of memos", v: s.memoCount },
    { k: "Sales", v: s.sales },
    { k: "Paid at sale", v: s.paidAtSale },
    { k: "Old dues collected", v: s.laterCollected },
    { k: "Total cash received", v: s.collected },
    { k: "Still due on these memos", v: s.dueFromTheseMemos },
    { k: "Aman's food", v: s.aman },
    { k: "Rofiq's food", v: s.rofiq },
    { k: "Food total", v: s.aman + s.rofiq },
    { k: s.sales - s.aman - s.rofiq >= 0 ? "Profit (sold − costs)" : "Loss (sold − costs)", v: Math.abs(s.sales - s.aman - s.rofiq) },
  ]);
  sum.getCell("B2").numFmt = "@";
  sum.getCell("B3").numFmt = "0";

  /* Memos */
  const ms = wb.addWorksheet("Memos");
  ms.columns = [
    { header: "Memo", key: "id", width: 8 },
    { header: "Date", key: "date", width: 12 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Address", key: "address", width: 28 },
    { header: "Products", key: "products", width: 34 },
    { header: "Cartons", key: "cartons", width: 9 },
    { header: "Pieces", key: "pieces", width: 9 },
    { header: "Total", key: "total", width: 14, style: { numFmt: MONEY } },
    { header: "Paid", key: "paid", width: 14, style: { numFmt: MONEY } },
    { header: "Due", key: "due", width: 14, style: { numFmt: MONEY } },
    { header: "Note", key: "note", width: 24 },
  ];
  styleHeader(ms);
  for (const m of data.memos) {
    ms.addRow({
      ...m,
      products: m.items.map((i) => i.productName).join(", "),
      cartons: m.items.reduce((a, i) => a + i.cartons, 0),
      pieces: m.items.reduce((a, i) => a + i.pieces, 0),
    });
  }
  totalRow(ms, {
    customerName: "Total",
    cartons: data.memos.reduce((a, m) => a + m.items.reduce((b, i) => b + i.cartons, 0), 0),
    pieces: data.memos.reduce((a, m) => a + m.items.reduce((b, i) => b + i.pieces, 0), 0),
    total: s.sales,
    paid: data.memos.reduce((a, m) => a + m.paid, 0),
    due: s.dueFromTheseMemos,
  });

  /* Products */
  const ps = wb.addWorksheet("Products");
  ps.columns = [
    { header: "Memo", key: "memoId", width: 8 },
    { header: "Date", key: "date", width: 12 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Product", key: "productName", width: 26 },
    { header: "Cartons", key: "cartons", width: 9 },
    { header: "Per carton", key: "cartonPrice", width: 13, style: { numFmt: MONEY } },
    { header: "Pieces", key: "pieces", width: 9 },
    { header: "Per piece", key: "piecePrice", width: 13, style: { numFmt: MONEY } },
    { header: "Amount", key: "lineTotal", width: 14, style: { numFmt: MONEY } },
  ];
  styleHeader(ps);
  for (const m of data.memos)
    for (const i of m.items) ps.addRow({ ...i, date: m.date, customerName: m.customerName });

  /* Collections */
  const cs = wb.addWorksheet("Due collections");
  cs.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Memo", key: "memoId", width: 8 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Amount", key: "amount", width: 14, style: { numFmt: MONEY } },
    { header: "Note", key: "note", width: 24 },
  ];
  styleHeader(cs);
  cs.addRows(data.payments);
  totalRow(cs, { customerName: "Total", amount: s.laterCollected });

  /* Food */
  for (const [person, name] of [["AMAN", "Aman food"], ["ROFIQ", "Rofiq food"]] as const) {
    const ws = wb.addWorksheet(name);
    ws.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "What", key: "item", width: 24 },
      { header: "Amount", key: "amount", width: 14, style: { numFmt: MONEY } },
      { header: "Note", key: "note", width: 28 },
    ];
    styleHeader(ws);
    const rows = data.expenses.filter((e) => e.person === person);
    ws.addRows(rows);
    totalRow(ws, { item: "Total", amount: rows.reduce((a, e) => a + e.amount, 0) });
  }

  const buf = await wb.xlsx.writeBuffer();
  const name = from === to ? `shop-hisab-${from}.xlsx` : `shop-hisab-${from}-to-${to}.xlsx`;
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
