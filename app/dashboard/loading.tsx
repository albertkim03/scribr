export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left sidebar skeleton */}
      <aside className="w-[280px] shrink-0 border-r border-[#DFE1E6] bg-white animate-pulse">
        <div className="px-3 pt-3 pb-2.5 border-b border-[#DFE1E6] space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-14 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-7 bg-slate-100 rounded-lg w-full" />
        </div>
        <div className="p-2 space-y-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2.5">
              <div className="w-[30px] h-[30px] bg-slate-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      {/* Right panel skeleton */}
      <main className="flex-1 bg-[#F8FAFF]" />
    </div>
  )
}
