"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { saveMemo, lookupCustomer, type MemoInput } from "@/lib/actions";
import { round2, tk } from "@/lib/format";
import { useT } from "./I18n";

type Row = {
  key: number;
  productName: string;
  cartons: string;
  cartonPrice: string;
  pieces: string;
  piecePrice: string;
};

export type MemoFormInitial = {
  date: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  paid: number;
  items: { productName: string; cartons: number; cartonPrice: number; pieces: number; piecePrice: number }[];
};

const n = (s: string) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};
const str = (v: number) => (v ? String(v) : "");

let nextKey = 1;
const blankRow = (): Row => ({ key: nextKey++, productName: "", cartons: "", cartonPrice: "", pieces: "", piecePrice: "" });

export function MemoForm({
  memoId,
  initial,
  laterPayments = 0,
  productNames,
}: {
  memoId?: number;
  initial: MemoFormInitial;
  laterPayments?: number;
  productNames: string[];
}) {
  const { t } = useT();
  const [date, setDate] = useState(initial.date);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [note, setNote] = useState(initial.note);
  const [showNote, setShowNote] = useState(Boolean(initial.note));
  const [paid, setPaid] = useState(str(initial.paid));
  const [rows, setRows] = useState<Row[]>(
    initial.items.length
      ? initial.items.map((i) => ({
          key: nextKey++,
          productName: i.productName,
          cartons: str(i.cartons),
          cartonPrice: str(i.cartonPrice),
          pieces: str(i.pieces),
          piecePrice: str(i.piecePrice),
        }))
      : [blankRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [pending, startTransition] = useTransition();
  const lastLookup = useRef("");

  const cartonAmt = rows.map((r) => round2(n(r.cartons) * n(r.cartonPrice)));
  const pieceAmt = rows.map((r) => round2(n(r.pieces) * n(r.piecePrice)));
  const total = round2(rows.reduce((a, _, i) => a + cartonAmt[i] + pieceAmt[i], 0));
  const due = round2(total - n(paid));

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onPhoneBlur() {
    const p = phone.trim();
    if (p.length < 6 || p === lastLookup.current) return;
    lastLookup.current = p;
    const hit = await lookupCustomer(p);
    if (hit) {
      setFound(true);
      if (!customerName) setCustomerName(hit.customerName);
      if (!address) setAddress(hit.address);
    } else setFound(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: MemoInput = {
      date,
      customerName,
      phone,
      address,
      note,
      paid: n(paid),
      items: rows
        .filter((r) => r.productName.trim() || r.cartons || r.pieces)
        .map((r) => ({
          productName: r.productName,
          cartons: n(r.cartons),
          cartonPrice: n(r.cartonPrice),
          pieces: n(r.pieces),
          piecePrice: n(r.piecePrice),
        })),
    };
    startTransition(async () => {
      const res = await saveMemo(memoId ?? null, input);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* 1. Customer */}
      <section className="panel p-4 sm:p-6">
        <Step n={1} title={t("form.customer")} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="phone">{t("form.phone")}</label>
            <input
              id="phone"
              className="input figures"
              type="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={onPhoneBlur}
              autoComplete="off"
            />
            <p className={`mt-1.5 text-xs ${found ? "font-medium text-paid" : "text-muted"}`}>
              {found ? t("form.phoneFound") : t("form.phoneHint")}
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="customerName">{t("form.name")}</label>
            <input id="customerName" className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required autoComplete="off" />
          </div>
          <div>
            <label className="field-label" htmlFor="address">{t("form.address")}</label>
            <input id="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="field-label" htmlFor="date">{t("c.date")}</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
      </section>

      {/* 2. Products */}
      <section className="panel overflow-hidden">
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <Step n={2} title={t("form.products")} />
          <p className="mt-1 text-sm text-muted">{t("form.productsHint")}</p>
        </div>

        <datalist id="product-names">
          {productNames.map((p) => <option key={p} value={p} />)}
        </datalist>

        <div className="ledger mt-4 border-t border-line">
          {rows.map((r, idx) => (
            <div key={r.key} className="px-4 py-4 sm:px-6">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="field-label" htmlFor={`p-${r.key}`}>
                    {rows.length > 1 ? t("form.productName", { n: idx + 1 }) : t("form.productNameSingle")}
                  </label>
                  <input
                    id={`p-${r.key}`}
                    list="product-names"
                    className="input"
                    value={r.productName}
                    onChange={(e) => update(r.key, { productName: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={t("form.removeProduct", { n: idx + 1 })}
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="grid h-[46px] w-11 shrink-0 place-items-center rounded-xl text-faint hover:bg-due-soft hover:text-due"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <QtyPrice
                  label={t("form.cartons")}
                  qtyLabel={t("form.howManyCartons")}
                  priceLabel={t("form.priceOneCarton")}
                  pricePh={t("form.pricePerCarton")}
                  qtyPh={t("form.qty")}
                  qty={r.cartons}
                  price={r.cartonPrice}
                  amount={cartonAmt[idx]}
                  onQty={(v) => update(r.key, { cartons: v })}
                  onPrice={(v) => update(r.key, { cartonPrice: v })}
                />
                <QtyPrice
                  label={t("form.pieces")}
                  qtyLabel={t("form.howManyPieces")}
                  priceLabel={t("form.priceOnePiece")}
                  pricePh={t("form.pricePerPiece")}
                  qtyPh={t("form.qty")}
                  qty={r.pieces}
                  price={r.piecePrice}
                  amount={pieceAmt[idx]}
                  onQty={(v) => update(r.key, { pieces: v })}
                  onPrice={(v) => update(r.key, { piecePrice: v })}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-3 sm:px-5">
          <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className="btn btn-quiet btn-sm w-full sm:w-auto">
            <Plus size={16} /> {t("form.addProduct")}
          </button>
        </div>
      </section>

      {showNote ? (
        <section className="panel p-4 sm:p-6">
          <label className="field-label" htmlFor="note">{t("c.note")}</label>
          <textarea id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={2} autoFocus={!initial.note} />
        </section>
      ) : (
        <button type="button" onClick={() => setShowNote(true)} className="text-sm font-medium text-accent">
          {t("form.addNote")}
        </button>
      )}

      {/* 3. Money: always in view */}
      <section
        className="panel sticky z-10 p-4 shadow-[0_-12px_32px_-20px_rgba(30,41,37,0.35)] sm:p-5 lg:!bottom-4"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-3 items-end gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{t("c.total")}</p>
            <p className="figures mt-1 truncate text-xl font-bold sm:text-2xl">{tk(total)}</p>
          </div>
          <div className="min-w-0">
            <label className="text-xs font-medium text-muted" htmlFor="paid">
              {t("c.paid")}
            </label>
            <input
              id="paid"
              className="input figures mt-1 !h-10 !px-3 font-semibold"
              inputMode="decimal"
              placeholder="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ""))}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium text-muted">{t("c.due")}</p>
            <p className={`figures mt-1 truncate text-xl font-bold sm:text-2xl ${due === 0 ? "text-paid" : "text-due"}`}>
              {tk(due)}
            </p>
          </div>
        </div>
        {laterPayments > 0 && (
          <p className="figures mt-2 text-xs text-muted">{t("form.laterIncluded", { amount: tk(laterPayments) })}</p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-due-soft px-3 py-2 text-sm text-due">{error}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-quiet" onClick={() => setPaid(String(total))} disabled={total <= 0}>
            {t("form.paidInFull")}
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary flex-1">
            {pending && <Loader2 size={18} className="animate-spin" />}
            {pending ? t("c.saving") : memoId ? t("c.saveChanges") : t("form.saveMemo")}
          </button>
        </div>
      </section>
    </form>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 font-semibold">
      <span className="figures grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{n}</span>
      {title}
    </h2>
  );
}

/** "Cartons: [qty] × ৳[price]  = ৳amount" */
function QtyPrice({
  label,
  qtyLabel,
  priceLabel,
  pricePh,
  qtyPh,
  qty,
  price,
  amount,
  onQty,
  onPrice,
}: {
  label: string;
  qtyLabel: string;
  priceLabel: string;
  pricePh: string;
  qtyPh: string;
  qty: string;
  price: string;
  amount: number;
  onQty: (v: string) => void;
  onPrice: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="rounded-xl bg-mist/70 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`figures text-sm font-semibold ${amount ? "text-ink" : "text-faint"}`}>{tk(amount)}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          aria-label={qtyLabel}
          className="input figures !h-11 w-[38%] text-center"
          inputMode="numeric"
          placeholder={qtyPh}
          value={qty}
          onChange={(e) => onQty(e.target.value.replace(/[^\d]/g, ""))}
        />
        <span className="text-muted">×</span>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">৳</span>
          <input
            aria-label={priceLabel}
            className="input figures !h-11 !pl-7"
            inputMode="decimal"
            placeholder={pricePh}
            value={price}
            onChange={(e) => onPrice(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </div>
    </div>
  );
}
