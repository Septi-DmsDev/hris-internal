import { SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function GradesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-24" />
      <SkeletonTable rows={5} />
    </div>
  );
}
