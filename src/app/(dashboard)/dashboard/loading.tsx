import { SkeletonCard, Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      <section>
        <Skeleton className="h-3 w-20 mb-3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>

      <section>
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm flex justify-between items-center">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="h-3 w-36 mb-3" />
        <SkeletonTable rows={4} />
      </section>
    </div>
  );
}
