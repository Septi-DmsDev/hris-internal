import { SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function TicketApprovalLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}
