export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-7 w-52 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-80 bg-slate-100 rounded animate-pulse mt-2" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-200" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
