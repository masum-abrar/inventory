// npm run demo:add     -> adds some sample memos and food costs (marked "[demo]")
// npm run demo:remove  -> deletes only those sample rows
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const { memos, memoItems, payments, expenses } = schema;
const TAG = "[demo]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const day = (offset: number) => {
  const d = new Date(Date.now() + 6 * 3600_000 + offset * 86400_000); // Dhaka time
  return d.toISOString().slice(0, 10);
};
const r2 = (n: number) => Math.round(n * 100) / 100;

async function add() {
  const customers = [
    { customerName: "Karim Store", phone: "01711000001", address: "Agrabad, Chattogram" },
    { customerName: "Rahim Traders", phone: "01811000002", address: "Halishahar, Chattogram" },
    { customerName: "Nasrin General Store", phone: "01911000003", address: "Pahartali, Chattogram" },
    { customerName: "Babul Mia", phone: "01611000004", address: "Bayezid, Chattogram" },
  ];
  const products = ["Soybean Oil 5L", "Miniket Rice 25kg", "Sugar 1kg", "Lentil 1kg", "Biscuits", "Detergent 500g"];

  for (let i = 0; i < 14; i++) {
    const c = customers[i % customers.length];
    const date = day(-Math.floor(i / 2));
    const items = Array.from({ length: 1 + (i % 3) }, (_, k) => {
      const cartons = (i + k) % 4;
      const pieces = cartons === 0 ? 6 + k : (i * 3 + k) % 7;
      const cartonPrice = 900 + ((i * 37 + k * 53) % 700);
      const piecePrice = 40 + ((i * 11 + k * 7) % 80);
      return {
        productName: products[(i + k * 2) % products.length],
        cartons,
        cartonPrice,
        pieces,
        piecePrice,
        lineTotal: r2(cartons * cartonPrice + pieces * piecePrice),
      };
    });
    const total = r2(items.reduce((a, it) => a + it.lineTotal, 0));
    const initialPaid = i % 3 === 0 ? total : i % 3 === 1 ? r2(Math.round(total * 0.6)) : 0;
    const later = i === 4 ? r2(Math.round((total - initialPaid) / 2)) : 0;
    const [m] = await db
      .insert(memos)
      .values({ ...c, date, total, initialPaid, paid: initialPaid + later, due: r2(total - initialPaid - later), note: TAG })
      .returning({ id: memos.id });
    await db.insert(memoItems).values(items.map((it) => ({ ...it, memoId: m.id })));
    if (later) await db.insert(payments).values({ memoId: m.id, date: day(0), amount: later, note: TAG });
  }

  for (let d = 0; d < 7; d++) {
    for (const person of ["AMAN", "ROFIQ"] as const) {
      await db.insert(expenses).values([
        { person, date: day(-d), item: "Breakfast", amount: 60 + d * 5, note: TAG },
        { person, date: day(-d), item: "Lunch", amount: 120 + (person === "AMAN" ? 10 : 0), note: TAG },
      ]);
    }
  }
  console.log("Demo data added.");
}

async function remove() {
  await db.delete(payments).where(eq(payments.note, TAG));
  await db.delete(memos).where(eq(memos.note, TAG));
  await db.delete(expenses).where(eq(expenses.note, TAG));
  console.log("Demo data removed.");
}

(process.argv[2] === "remove" ? remove() : add())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
