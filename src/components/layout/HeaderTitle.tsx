"use client";

import { usePathname } from "next/navigation";
import { resolveHeaderMeta } from "./header-title";

export default function HeaderTitle() {
  const pathname = usePathname();
  const meta = resolveHeaderMeta(pathname);

  return (
    <div className="leading-tight">
      <p className="text-sm font-semibold text-slate-800">{meta.title}</p>
      <p className="text-xs text-slate-500">{meta.description}</p>
    </div>
  );
}
