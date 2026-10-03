import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { memoNo, niceDate, niceDateShort, round2 } from "@/lib/format";
import { shopInfo } from "@/lib/shop";
import type { getMemo, reportData } from "@/lib/queries";
import { dailyRows } from "@/lib/queries";

/*
 * Builds real PDF files on the server, so the phone downloads them directly.
 * Two fonts: Figtree for text and numbers, Hind Siliguri for the ৳ sign.
 */

const FONT_DIR = path.join(process.cwd(), "fonts");
const font = (f: string) => fs.readFileSync(path.join(FONT_DIR, f));
let cache: Record<string, Buffer> | null = null;
function fonts() {
  cache ??= {
    regular: font("Figtree-Regular.ttf"),
    bold: font("Figtree-Bold.ttf"),
    taka: font("HindSiliguri-Regular.ttf"),
    takaBold: font("HindSiliguri-SemiBold.ttf"),
  };
  return cache;
}

const INK = "#1e2925";
const MUTED = "#6a7873";
const LINE = "#d5dcd9";
const ACCENT = "#2e6b5b";
const DUE = "#b5475a";

const moneyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const money = (n: number) => `৳${moneyFmt.format(round2(n))}`;

type Align = "left" | "right" | "center";

class Pdf {
  doc: PDFKit.PDFDocument;
  left = 40;
  right: number;
  bottom: number;

  constructor(title: string) {
    const f = fonts();
    this.doc = new PDFDocument({
      size: "A4",
      margin: 40,
      font: f.regular as unknown as string,
      info: { Title: title, Author: shopInfo().name },
      bufferPages: true,
    });
    this.doc.registerFont("regular", f.regular);
    this.doc.registerFont("bold", f.bold);
    this.doc.registerFont("taka", f.taka);
    this.doc.registerFont("takaBold", f.takaBold);
    this.right = this.doc.page.width - 40;
    this.bottom = this.doc.page.height - 50;
  }

  get y() {
    return this.doc.y;
  }
  set y(v: number) {
    this.doc.y = v;
  }

  private asc: Record<string, number> = {};
  private ascender(name: string) {
    if (this.asc[name] === undefined) {
      this.doc.font(name);
      this.asc[name] = (this.doc as unknown as { _font: { ascender: number } })._font.ascender;
    }
    return this.asc[name];
  }

  /** Split text into runs so ৳ uses the Bengali font */
  private runs(text: string, bold: boolean) {
    const out: { t: string; f: string }[] = [];
    for (const ch of text) {
      const f = ch === "৳" ? (bold ? "takaBold" : "taka") : bold ? "bold" : "regular";
      const last = out[out.length - 1];
      if (last && last.f === f) last.t += ch;
      else out.push({ t: ch, f });
    }
    return out;
  }

  width(text: string, size: number, bold = false) {
    let w = 0;
    for (const r of this.runs(text, bold)) w += this.doc.font(r.f).fontSize(size).widthOfString(r.t);
    return w;
  }

  /** Write one line of text at (x, y). For right align, x is the right edge. */
  text(text: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: string; align?: Align; maxWidth?: number } = {}) {
    const size = o.size ?? 10;
    let s = text;
    if (o.maxWidth) {
      while (s.length > 1 && this.width(s, size, o.bold) > o.maxWidth) s = s.slice(0, -2) + "…";
    }
    const w = this.width(s, size, o.bold);
    let cx = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
    this.doc.fillColor(o.color ?? INK);
    for (const r of this.runs(s, Boolean(o.bold))) {
      this.doc.font(r.f).fontSize(size);
      // The two fonts have different ascenders; line them up on one baseline
      const dy = ((this.ascender(o.bold ? "bold" : "regular") - this.ascender(r.f)) * size) / 1000;
      this.doc.text(r.t, cx, y + dy, { lineBreak: false });
      cx += this.doc.widthOfString(r.t);
    }
    this.doc.y = y;
    return w;
  }

  /** Wrapped text (no ৳ inside); returns height used */
  para(text: string, x: number, y: number, width: number, o: { size?: number; color?: string } = {}) {
    this.doc.font("regular").fontSize(o.size ?? 10).fillColor(o.color ?? INK);
    const h = this.doc.heightOfString(text, { width });
    this.doc.text(text, x, y, { width });
    return h;
  }

  rule(y: number, color = LINE, w = 0.75) {
    this.doc.moveTo(this.left, y).lineTo(this.right, y).lineWidth(w).strokeColor(color).stroke();
  }

  /** Start a new page if fewer than `need` points are left */
  ensure(need: number, onNewPage?: () => void) {
    if (this.y + need > this.bottom) {
      this.doc.addPage();
      this.y = 40;
      onNewPage?.();
    }
  }

  footer(label: string) {
    const range = this.doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      this.doc.switchToPage(range.start + i);
      const y = this.doc.page.height - 30;
      // Writing in the bottom margin must not create a new page
      const m = this.doc.page.margins.bottom;
      this.doc.page.margins.bottom = 0;
      this.text(label, this.left, y, { size: 8, color: MUTED });
      this.text(`Page ${i + 1} of ${range.count}`, this.right, y, { size: 8, color: MUTED, align: "right" });
      this.doc.page.margins.bottom = m;
    }
  }

  async toBuffer() {
    const chunks: Buffer[] = [];
    this.doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<void>((res) => this.doc.on("end", () => res()));
    this.doc.end();
    await done;
    return Buffer.concat(chunks);
  }
}

type Col = { label: string; w: number; align?: Align };

function tableHeader(p: Pdf, cols: Col[], y: number) {
  let x = p.left;
  for (const c of cols) {
    p.text(c.label, c.align === "right" ? x + c.w - 4 : x, y, { size: 8.5, bold: true, color: MUTED, align: c.align });
    x += c.w;
  }
  p.rule(y + 14, INK, 0.8);
  return y + 20;
}

/* ---------------- Memo ---------------- */

export async function memoPdf(memo: NonNullable<Awaited<ReturnType<typeof getMemo>>>) {
  const shop = shopInfo();
  const p = new Pdf(`Memo ${memoNo(memo.id)}`);
  let y = 40;

  p.text(shop.name, p.left, y, { size: 20, bold: true });
  p.text(`Memo ${memoNo(memo.id)}`, p.right, y + 2, { size: 14, bold: true, align: "right" });
  y += 28;
  if (shop.address) p.text(shop.address, p.left, y, { size: 10, color: MUTED });
  p.text(niceDate(memo.date), p.right, y, { size: 10, color: MUTED, align: "right" });
  if (shop.phone) p.text(shop.phone, p.left, y + 14, { size: 10, color: MUTED });
  y += 34;
  p.rule(y, INK, 1.5);
  y += 16;

  p.text("Bill to", p.left, y, { size: 9, color: MUTED });
  y += 13;
  p.text(memo.customerName, p.left, y, { size: 13, bold: true });
  y += 18;
  if (memo.phone) {
    p.text(memo.phone, p.left, y, { size: 10 });
    y += 14;
  }
  if (memo.address) y += p.para(memo.address, p.left, y, 300, { size: 10, color: MUTED }) + 2;
  y += 16;

  const cols: Col[] = [
    { label: "#", w: 22 },
    { label: "Product", w: 170 },
    { label: "Cartons", w: 52, align: "right" },
    { label: "Per carton", w: 72, align: "right" },
    { label: "Pieces", w: 48, align: "right" },
    { label: "Per piece", w: 66, align: "right" },
    { label: "Amount", w: 85, align: "right" },
  ];
  const header = () => {
    p.y = tableHeader(p, cols, p.y);
  };
  p.y = y;
  header();

  memo.items.forEach((it, i) => {
    p.ensure(24, header);
    const ry = p.y;
    const cells = [
      String(i + 1),
      it.productName,
      it.cartons ? String(it.cartons) : "–",
      it.cartons ? money(it.cartonPrice) : "–",
      it.pieces ? String(it.pieces) : "–",
      it.pieces ? money(it.piecePrice) : "–",
      money(it.lineTotal),
    ];
    let x = p.left;
    cells.forEach((c, ci) => {
      const col = cols[ci];
      p.text(c, col.align === "right" ? x + col.w - 4 : x, ry, {
        size: 10,
        bold: ci === 6,
        color: ci === 0 ? MUTED : INK,
        align: col.align,
        maxWidth: col.w - 8,
      });
      x += col.w;
    });
    p.rule(ry + 17);
    p.y = ry + 24;
  });

  // Totals box on the right
  p.ensure(120);
  y = p.y + 8;
  const lx = p.right - 220;
  const line = (label: string, value: string, o: { bold?: boolean; color?: string; size?: number } = {}) => {
    p.text(label, lx, y, { size: o.size ?? 10.5, bold: o.bold });
    p.text(value, p.right - 4, y, { size: o.size ?? 10.5, bold: o.bold, color: o.color, align: "right" });
    y += (o.size ?? 10.5) + 9;
  };
  line("Total", money(memo.total), { bold: true, size: 12.5 });
  if (memo.initialPaid > 0 || memo.payments.length === 0) line("Paid", money(memo.initialPaid));
  for (const pay of memo.payments) line(`Paid ${niceDateShort(pay.date)}`, money(pay.amount));
  y += 2;
  p.doc.moveTo(lx, y).lineTo(p.right, y).lineWidth(1.5).strokeColor(INK).stroke();
  y += 8;
  line(memo.due > 0 ? "Due" : "Fully paid", money(memo.due), { bold: true, size: 13, color: memo.due > 0 ? DUE : ACCENT });

  if (memo.note) {
    y += 10;
    p.text("Note", p.left, y, { size: 9, color: MUTED });
    y += 13;
    y += p.para(memo.note, p.left, y, p.right - p.left, { size: 10 });
  }

  // Signatures
  y = Math.max(y + 60, p.y + 60);
  if (y > p.bottom - 20) {
    p.doc.addPage();
    y = 120;
  }
  p.doc.moveTo(p.left, y).lineTo(p.left + 150, y).lineWidth(0.75).strokeColor(MUTED).stroke();
  p.doc.moveTo(p.right - 150, y).lineTo(p.right, y).stroke();
  p.text("Customer signature", p.left + 75, y + 5, { size: 8.5, color: MUTED, align: "center" });
  p.text(`For ${shop.name}`, p.right - 75, y + 5, { size: 8.5, color: MUTED, align: "center" });

  p.footer(`${shop.name} · Memo ${memoNo(memo.id)}`);
  return p.toBuffer();
}

/* ---------------- Report ---------------- */

export async function reportPdf(data: Awaited<ReturnType<typeof reportData>>, from: string, to: string) {
  const shop = shopInfo();
  const s = data.summary;
  const period = from === to ? niceDate(from) : `${niceDate(from)} – ${niceDate(to)}`;
  const p = new Pdf(`Report ${period}`);
  let y = 40;

  p.text(`${shop.name} · Report`, p.left, y, { size: 18, bold: true });
  y += 24;
  p.text(period, p.left, y, { size: 10.5, color: MUTED });
  y += 22;
  p.rule(y, INK, 1.5);
  y += 16;

  // Summary in 3 columns
  const boxes: [string, string, string?][] = [
    ["Sold", money(s.sales), `${s.memoCount} memos`],
    ["Cash received", money(s.collected), s.laterCollected ? `${money(s.laterCollected)} from old dues` : undefined],
    ["Due left on these memos", money(s.dueFromTheseMemos)],
    ["Aman's food", money(s.aman)],
    ["Rofiq's food", money(s.rofiq)],
    [s.sales - s.aman - s.rofiq >= 0 ? "Profit (sold − costs)" : "Loss (sold − costs)", money(Math.abs(s.sales - s.aman - s.rofiq))],
  ];
  const bw = (p.right - p.left) / 3;
  boxes.forEach(([label, value, sub], i) => {
    const bx = p.left + (i % 3) * bw;
    const by = y + Math.floor(i / 3) * 52;
    p.text(label, bx, by, { size: 9, color: MUTED });
    const profit = s.sales - s.aman - s.rofiq;
    const color = i === 2 && s.dueFromTheseMemos > 0 ? DUE : i === 5 ? (profit < 0 ? DUE : ACCENT) : INK;
    p.text(value, bx, by + 13, { size: 14, bold: true, color });
    if (sub) p.text(sub, bx, by + 32, { size: 8.5, color: MUTED });
  });
  y += 112;

  // Day by day
  const days = dailyRows(data);
  if (days.length) {
    p.text("Day by day", p.left, y, { size: 12, bold: true });
    p.y = y + 22;
    const cols: Col[] = [
      { label: "Date", w: 95 },
      { label: "Sold", w: 85, align: "right" },
      { label: "Cash in", w: 85, align: "right" },
      { label: "Due", w: 80, align: "right" },
      { label: "Aman", w: 85, align: "right" },
      { label: "Rofiq", w: 85, align: "right" },
    ];
    const header = () => {
      p.y = tableHeader(p, cols, p.y);
    };
    header();
    for (const [d, x] of days) {
      p.ensure(20, header);
      const ry = p.y;
      const cells = [niceDate(d), money(x.sales), money(x.cash), money(x.due), money(x.aman), money(x.rofiq)];
      let cx = p.left;
      cells.forEach((c, ci) => {
        const col = cols[ci];
        p.text(c, col.align === "right" ? cx + col.w - 4 : cx, ry, {
          size: 9.5,
          align: col.align,
          color: ci === 3 && x.due > 0 ? DUE : INK,
        });
        cx += col.w;
      });
      p.rule(ry + 15);
      p.y = ry + 20;
    }
    y = p.y + 16;
  }

  // Memos
  p.y = y;
  p.ensure(80);
  p.text("Memos", p.left, p.y, { size: 12, bold: true });
  p.y += 22;
  const mcols: Col[] = [
    { label: "Date", w: 52 },
    { label: "Memo", w: 44 },
    { label: "Customer", w: 130 },
    { label: "Products", w: 133 },
    { label: "Total", w: 52, align: "right" },
    { label: "Paid", w: 52, align: "right" },
    { label: "Due", w: 52, align: "right" },
  ];
  const mheader = () => {
    p.y = tableHeader(p, mcols, p.y);
  };
  mheader();
  if (!data.memos.length) {
    p.text("No memos in this period.", p.left, p.y, { size: 10, color: MUTED });
    p.y += 20;
  }
  for (const m of data.memos) {
    p.ensure(22, mheader);
    const ry = p.y;
    const prod = m.items
      .map((i) => `${i.productName} (${[i.cartons ? `${i.cartons} ctn` : "", i.pieces ? `${i.pieces} pcs` : ""].filter(Boolean).join(" + ")})`)
      .join(", ");
    const cells = [niceDateShort(m.date), memoNo(m.id), m.customerName, prod, money(m.total), money(m.paid), money(m.due)];
    let cx = p.left;
    cells.forEach((c, ci) => {
      const col = mcols[ci];
      p.text(c, col.align === "right" ? cx + col.w - 3 : cx, ry, {
        size: 8.5,
        align: col.align,
        maxWidth: col.w - 6,
        color: ci === 6 && m.due > 0 ? DUE : ci === 3 ? MUTED : INK,
      });
      cx += col.w;
    });
    p.rule(ry + 14);
    p.y = ry + 19;
  }
  if (data.memos.length) {
    p.ensure(20);
    const ry = p.y + 2;
    p.text("Total", p.left, ry, { size: 9, bold: true });
    const ends = [mcols.slice(0, 5), mcols.slice(0, 6), mcols].map((cs) => p.left + cs.reduce((a, c) => a + c.w, 0) - 3);
    const paidSum = data.memos.reduce((a, m) => a + m.paid, 0);
    [s.sales, paidSum, s.dueFromTheseMemos].forEach((v, i) => p.text(money(v), ends[i], ry, { size: 9, bold: true, align: "right" }));
    p.y = ry + 24;
  }

  // Old dues collected
  if (data.payments.length) {
    p.ensure(70);
    p.text("Old dues collected", p.left, p.y, { size: 12, bold: true });
    p.y += 22;
    const pcols: Col[] = [
      { label: "Date", w: 95 },
      { label: "Memo", w: 70 },
      { label: "Customer", w: 250 },
      { label: "Amount", w: 100, align: "right" },
    ];
    const ph = () => {
      p.y = tableHeader(p, pcols, p.y);
    };
    ph();
    for (const pay of data.payments) {
      p.ensure(20, ph);
      const ry = p.y;
      const cells = [niceDate(pay.date), memoNo(pay.memoId), pay.customerName, money(pay.amount)];
      let cx = p.left;
      cells.forEach((c, ci) => {
        const col = pcols[ci];
        p.text(c, col.align === "right" ? cx + col.w - 4 : cx, ry, { size: 9.5, align: col.align, maxWidth: col.w - 8 });
        cx += col.w;
      });
      p.rule(ry + 15);
      p.y = ry + 20;
    }
    p.y += 14;
  }

  // Food
  for (const [person, name] of [["AMAN", "Aman's food"], ["ROFIQ", "Rofiq's food"]] as const) {
    const rows = data.expenses.filter((e) => e.person === person);
    p.ensure(70);
    p.text(name, p.left, p.y, { size: 12, bold: true });
    p.y += 22;
    const ecols: Col[] = [
      { label: "Date", w: 95 },
      { label: "What", w: 320 },
      { label: "Amount", w: 100, align: "right" },
    ];
    const eh = () => {
      p.y = tableHeader(p, ecols, p.y);
    };
    eh();
    for (const e of rows) {
      p.ensure(20, eh);
      const ry = p.y;
      p.text(niceDate(e.date), p.left, ry, { size: 9.5 });
      p.text(e.note ? `${e.item} · ${e.note}` : e.item, p.left + 95, ry, { size: 9.5, maxWidth: 310 });
      p.text(money(e.amount), p.left + 515 - 4, ry, { size: 9.5, align: "right" });
      p.rule(ry + 15);
      p.y = ry + 20;
    }
    p.ensure(20);
    const total = rows.reduce((a, e) => a + e.amount, 0);
    p.text("Total", p.left, p.y + 2, { size: 9.5, bold: true });
    p.text(money(total), p.left + 515 - 4, p.y + 2, { size: 9.5, bold: true, align: "right" });
    p.y += 30;
  }

  p.footer(`${shop.name} · ${period}`);
  return p.toBuffer();
}
