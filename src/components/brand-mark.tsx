import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-9 place-items-center rounded-md bg-primary", className)} aria-hidden="true">
      <span className="absolute h-4 w-1.5 rounded-full bg-primary-foreground" />
      <span className="absolute h-1.5 w-4 rounded-full bg-primary-foreground" />
    </span>
  );
}