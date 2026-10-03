import { TopBar } from "@/components/ListControls";

// Shown right away while a page loads its data
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <TopBar />
      <div className="skeleton h-8 w-48" />
      <div className="skeleton mt-2 h-4 w-32" />
      <div className="panel mt-6 p-5">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-3 h-10 w-44" />
      </div>
      <div className="panel ledger mt-5 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex-1">
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton mt-2 h-3 w-3/5" />
            </div>
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
