import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/** Variance mark — subtle variance/candlestick squiggle from the brand guide. */
export function VarianceMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("h-8 w-8", className)}
      {...props}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M6 22 L10 14 L14 18 L18 10 L22 16 L26 8"
        className="stroke-primary-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VarianceWordmark({
  showTagline = false,
  className,
}: {
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-display text-lg font-bold tracking-tight text-primary">
        Variance
      </span>
      {showTagline && (
        <span className="label-caps mt-0.5">Simple / Stable</span>
      )}
    </div>
  );
}

export function VarianceLogo({
  showTagline = false,
  className,
}: {
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <VarianceMark className="h-8 w-8 shrink-0" />
      <VarianceWordmark showTagline={showTagline} />
    </div>
  );
}
