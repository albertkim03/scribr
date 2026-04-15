import Nav from '@/components/Nav'

function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
        <div className="w-4 h-4 bg-slate-200 rounded shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className={`h-3.5 bg-slate-200 rounded ${wide ? 'w-40' : 'w-28'}`} />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
        <div className="h-7 w-14 bg-slate-100 rounded-lg" />
        <div className="h-7 w-6 bg-slate-100 rounded-lg" />
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* Top bar skeleton */}
        <div className="flex items-center gap-2 mb-3 animate-pulse">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-6 bg-slate-100 rounded-full" />
          <div className="h-7 w-36 bg-slate-100 rounded-lg" />
          <div className="ml-auto h-7 w-24 bg-slate-200 rounded-lg" />
        </div>
        {/* Student rows */}
        <div className="space-y-2">
          <SkeletonRow wide />
          <SkeletonRow />
          <SkeletonRow wide />
          <SkeletonRow />
          <SkeletonRow wide />
        </div>
      </main>
    </>
  )
}
