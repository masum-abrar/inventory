import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/I18n";
import { FeedbackProvider } from "@/components/Feedback";
import { EARLY_INSTALL_SCRIPT, ServiceWorker } from "@/components/InstallApp";

export const metadata: Metadata = {
  title: { default: "Shop Hisab", template: "%s · Shop Hisab" },
  description: "Daily sales, dues and food expenses for the shop",
  applicationName: "Shop Hisab",
  // iPhone: open full screen when added to the home screen
  appleWebApp: { capable: true, title: "Shop Hisab", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f2f4f3",
  width: "device-width",
  initialScale: 1,
};

// All pages read live data from the database
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_INSTALL_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <I18nProvider lang={lang}>
          <FeedbackProvider>{children}</FeedbackProvider>
          <ServiceWorker />
        </I18nProvider>
      </body>
    </html>
  );
}
