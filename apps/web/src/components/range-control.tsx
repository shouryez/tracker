"use client";

import Link from "next/link";
import { SegmentedControl } from "@upsolve/ui";

/** Range picker whose segments are links (the range lives in the URL). */
export function RangeControl({
  value,
  items,
  label = "Time range",
}: {
  value: string;
  items: { value: string; label: string; href: string }[];
  label?: string;
}) {
  return <SegmentedControl label={label} value={value} items={items} linkComponent={Link} />;
}

// DsaKaro
