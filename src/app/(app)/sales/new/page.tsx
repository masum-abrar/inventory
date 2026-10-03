import { MemoForm } from "@/components/MemoForm";
import { PageHeader } from "@/components/ui";
import { productNames } from "@/lib/queries";
import { todayStr } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "New memo" };

export default async function NewMemoPage() {
  const [{ t }, names] = await Promise.all([getT(), productNames()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("form.newTitle")} sub={t("form.newSub")} />
      <MemoForm
        productNames={names}
        initial={{ date: todayStr(), customerName: "", phone: "", address: "", note: "", paid: 0, items: [] }}
      />
    </div>
  );
}
