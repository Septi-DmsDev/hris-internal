"use client";

import { usePathname } from "next/navigation";
import { resolveHeaderTitle } from "./header-title";

export default function HeaderTitle() {
  const pathname = usePathname();

  return <span className="text-sm font-semibold text-slate-800">{resolveHeaderTitle(pathname)}</span>;
}
