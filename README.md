# Shop Hisab

Dokaner daily sells, customer-er baki (due), ar Aman o Rofiq-er food expense-er hisab rakhar app.
Phone, tablet ar computer, shob jaygay cholbe.

**Ki ki ache**
- **Home:** ajke koto bikri, hate koto cash, customer-der kache koto baki, ajker khabar khoroch. Upore 3ta boro button: New memo, Take due, Food cost.
- **New memo:** 3 dhap. (1) Customer (phone dile purono customer-er naam/address nije boshe), (2) Product: carton ar tukri, protibar notun dam, (3) Paid likhun, Due nije hisab hoy.
- **Sales:** likhte likhtei search hoy (Enter lage na). Date, "Has due / Paid" filter, ar page-by-page list.
- **Dues:** kon customer-er kache koto baki. **Take payment** chaple taka likhe save korun; sobcheye purono memo theke age kete jay.
- **Aman / Rofiq:** alada tab. Breakfast/Lunch chap diye taka likhlei hoye gelo.
- **Reports:** je kono date-er hisab. **PDF** ar **Excel** sorasori download hoy.
- **Memo PDF:** memo khule **Download PDF**, customer-ke pathan ba print korun.
- **PIN login:** ekbar dile oi device 7 din mone rakhe.
- **Bangla / English:** upore button chap diye bhasha bodlan.
- **Lav / Loss:** Home ar Reports-e, Lav = Bikri − Khoroch.
- **App hisebe install:** phone-e ba computer-e install kora jay (niche 5 number dekhun).

---

## 1. Computer-e ja lagbe (ekbar-i)

1. **Node.js** (LTS version): https://nodejs.org theke download kore install korun.
   Check korte terminal-e likhun: `node -v` (20.9 ba tar beshi hote hobe)
2. **VS Code** (optional, kintu sudhidha hoy): https://code.visualstudio.com

## 2. Neon database banano

1. https://neon.tech e jan, **Sign up** korun (Google diye korlei hobe).
2. **Create project** korun:
   - Name: `shop-hisab`
   - Region: **AWS Asia Pacific (Singapore)**
3. Dashboard-e **Connect** button-e click korun, connection string ta copy korun.
   (Pooled link-er bhitore `-pooler` lekha thake.)

> Ei link ta password-er moto. Karo sathe share korben na.

## 3. Project chalu kora

Ei folder-e terminal khulun (VS Code-e: **Terminal → New Terminal**), tarpor:

```bash
# 1. .env file banan
cp .env.example .env        # Windows hole: copy .env.example .env
```

`.env` file khule ei 3ta jinish bosan:

```env
DATABASE_URL="Neon theke copy kora link"
APP_PIN="apnar PIN, jemon 4821"
AUTH_SECRET="ekta lomba random lekha, jemon amar-dokan-9f8s7d6f5g4h3j2k"
```

Chaile `SHOP_NAME`, `SHOP_PHONE`, `SHOP_ADDRESS`-o din, egula memo print-e uthbe.

Tarpor:

```bash
npm install          # package gulo install hobe (prothom bar ektu somoy lagbe)
npm run db:push      # Neon-e table gulo toiri hobe
npm run dev          # app chalu hobe
```

Browser-e jan: **http://localhost:3000** ar apnar PIN din.

**Demo data dekhte chaile (optional):**
```bash
npm run demo:add       # kichu sample memo ar expense jog hobe
npm run demo:remove    # shudhu sample gulo muche jabe, apnar asol data thakbe
```

## 4. Online-e deya (deploy) — Vercel

Deploy korle ekta link paben (jemon `shop-hisab.vercel.app`). Phone, dokan, bari, shob jayga theke eki hisab dekha jabe.

> **Plan niye kotha:** Vercel-er free **Hobby** plan shudhu non-commercial (byaktigoto) kajer jonno.
> Dokaner kaje niyom moto **Pro** plan ($20/mas) nite hobe. Free bikolpo chaile Netlify-r free plan dekhte paren (tader niyom porhe nin).
> Render-er free plan 15 minit bekar thakle ghumiye jay, abar jagte ~1 minit lage — dokaner jonno bhalo na.

### Dhap 1: Code GitHub-e tola
1. https://github.com e account khulun.
2. Computer-e **Git** install korun: https://git-scm.com/download/win (sob default rekhe Next).
3. VS Code-e project folder khulun → bam pashe **Source Control** (teen dot-er branch icon) →
   **Initialize Repository** → upore message likhun (jemon `first version`) → **Commit** →
   **Publish Branch** → **Publish to GitHub private repository** bechhe nin.
4. `.env` file GitHub-e jabe na (`.gitignore`-e bondho kora), tai apnar password/link nirapod thakbe.

### Dhap 2: Vercel-e deploy
1. https://vercel.com e **Continue with GitHub** diye login korun.
2. **Add New → Project** → apnar `shop-hisab` repository-r pashe **Import**.
3. **Environment Variables** khule `.env`-er moto egulo bosan:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon-er `-pooler` wala link |
   | `APP_PIN` | apnar PIN |
   | `AUTH_SECRET` | lomba random lekha (`.env`-er ta-i din) |
   | `SHOP_NAME`, `SHOP_PHONE`, `SHOP_ADDRESS` | (optional) memo-te ja uthbe |

4. **Deploy** chapun. 1-2 minit por link paben. Server Singapore-e chalbe (`vercel.json`-e set kora), Neon-er kachakachi, tai druto.
5. Demo data dhukiye thakle asol kaj shuru korar age computer theke `npm run demo:remove` chalan.

### Dhap 3: Pore kichu bodlale
VS Code-e change korun → Source Control-e **Commit** → **Sync Changes**. Vercel nije-i notun version deploy kore dibe, 1-2 minit-e.

## 5. Phone-e App hisebe install

Deploy-er link phone-e khulun, PIN din. Tarpor:

- **Android (Chrome):** Home page-e **"Install app"** card ashbe → chapun → **Install**.
  Card na ashle Chrome-er menu (⋮) → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** Home page-e **Install app** chaple 3 dhap dekhabe: Share button → **Add to Home Screen** → **Add**.
- **Computer (Chrome/Edge):** bam pashe menu-te **Install app**, ba address bar-er dan pashe install icon.

Install korle home screen-e app-er icon ashbe, khulle browser-er bar chara pura screen-e cholbe.
App icon-e chap diye dhore rakhle **New memo** ar **Dues** sorasori khola jay.
Internet na thakle "No internet" page dekhabe; net ashle nije-i abar chalu hobe.

> Play Store-e dite chaile: ei app ta-i **PWABuilder** (https://www.pwabuilder.com) diye Android app banie Play Store-e deya jay. Google developer account-e ekbar $25 lage.

## Kaj er tips

- **PDF:** "Download PDF" chaple file sorasori download hoy. Shudhu print korte chaile "Print" chapun.
- **PIN bodlate:** `.env` (ba Vercel-er Environment Variables)-e `APP_PIN` bodlan. Shob device logout hoye jabe.
- **Backup:** Neon nije backup rakhe. Tar por-o maase ekbar Reports theke Excel download kore rakha bhalo.

## Command gulo

| Command | Ki kore |
|---|---|
| `npm run dev` | Computer-e app chalay (localhost:3000) |
| `npm run db:push` | Database-e table banay / update kore |
| `npm run build` then `npm start` | Production mode-e chalay |
| `npm run demo:add` / `demo:remove` | Sample data jog / muche fela |

## Bhitorer jinish (developer-der jonno)

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Neon) · ExcelJS · PDFKit

```
src/
  app/(app)/          sob page (home, sales, dues, expenses, reports)
  app/print/          print page
  app/api/export/     Excel download
  app/api/pdf/        PDF download (memo + report)
  lib/pdf.ts          PDF banano
fonts/                PDF-er font (৳ chinho soho)
  app/login/          PIN login
  components/         form, list, nav
  db/schema.ts        database table
  lib/actions.ts      save / delete (server actions)
  lib/queries.ts      data porar query
  proxy.ts            login chara kono page khulbe na
```
