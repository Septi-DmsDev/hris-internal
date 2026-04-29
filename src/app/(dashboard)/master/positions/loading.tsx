import { SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function PositionsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-28" />
      <SkeletonTable rows={5} />
    </div>
  );
}
