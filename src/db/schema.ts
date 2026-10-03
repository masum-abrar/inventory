import {
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" }).notNull().default(0);

// One memo = one sale to one customer (can hold many products)
export const memos = pgTable(
  "memos",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    total: money("total"),
    // amount paid at the time of sale
    initialPaid: money("initial_paid"),
    // initialPaid + all later payments (kept in sync by the app)
    paid: money("paid"),
    due: money("due"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memos_date_idx").on(t.date), index("memos_phone_idx").on(t.phone)],
);

export const memoItems = pgTable(
  "memo_items",
  {
    id: serial("id").primaryKey(),
    memoId: integer("memo_id")
      .notNull()
      .references(() => memos.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    cartons: integer("cartons").notNull().default(0),
    cartonPrice: money("carton_price"),
    pieces: integer("pieces").notNull().default(0),
    piecePrice: money("piece_price"),
    lineTotal: money("line_total"),
  },
  (t) => [index("items_memo_idx").on(t.memoId)],
);

// Later due collections
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    memoId: integer("memo_id")
      .notNull()
      .references(() => memos.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    amount: money("amount"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_memo_idx").on(t.memoId), index("payments_date_idx").on(t.date)],
);

export const personEnum = pgEnum("person", ["AMAN", "ROFIQ"]);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    person: personEnum("person").notNull(),
    date: date("date").notNull(),
    item: text("item").notNull(),
    amount: money("amount"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("expenses_person_date_idx").on(t.person, t.date)],
);

export const memosRelations = relations(memos, ({ many }) => ({
  items: many(memoItems),
  payments: many(payments),
}));
export const memoItemsRelations = relations(memoItems, ({ one }) => ({
  memo: one(memos, { fields: [memoItems.memoId], references: [memos.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  memo: one(memos, { fields: [payments.memoId], references: [memos.id] }),
}));

export type Memo = typeof memos.$inferSelect;
export type MemoItem = typeof memoItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Person = (typeof personEnum.enumValues)[number];
