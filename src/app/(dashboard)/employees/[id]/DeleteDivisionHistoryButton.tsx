"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteEmployeeDivisionHistory } from "@/server/actions/employees";
import { Button } from "@/components/ui/button";

type Props = {
  employeeId: string;
  historyId: string;
};

export default function DeleteDivisionHistoryButton({ employeeId, historyId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Hapus histori divisi ini?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteEmployeeDivisionHistory({ employeeId, historyId });
            if (result && "error" in result) {
              setError(result.error);
              return;
            }
            window.location.reload();
          });
        }}
        aria-label="Hapus histori divisi"
        title="Hapus histori divisi"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
