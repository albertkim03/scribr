import Nav from '@/components/Nav'

function SkeletonCard({ previewWidth = 'w-3/4' }: { previewWidth?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
        {/* Avatar */}
        <div className="w-9 h-9 bg-slate-200 rounded-full shrink-0" />
        {/* Text */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 bg-slate-200 rounded w-28" />
            <div className="h-4 bg-slate-100 rounded-full w-16" />
          </div>
          <div className={`h-3 bg-slate-100 rounded ${previewWidth}`} />
        </div>
        {/* Chevron */}
        <div className="w-7 h-7 bg-slate-100 rounded-lg shrink-0" />
      </div>
    </div>
  )
}

export default function ReportsLoading() {
  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* Top bar skeleton */}
        <div className="flex items-center gap-2 mb-3 animate-pulse">
          <div className="h-4 w-14 bg-slate-200 rounded" />
          <div className="h-5 w-6 bg-slate-100 rounded-full" />
          <div className="h-7 w-36 bg-slate-100 rounded-lg" />
        </div>
        {/* Report cards */}
        <div className="space-y-2">
          <SkeletonCard previewWidth="w-3/4" />
          <SkeletonCard previewWidth="w-1/2" />
          <SkeletonCard previewWidth="w-2/3" />
          <SkeletonCard previewWidth="w-5/6" />
        </div>
      </main>
    </>
  )
}
