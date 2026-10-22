import { cn } from "@/lib/cn";

export function Logo({
  variant = "light",
  showWordmark = true,
  className,
}: {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
}) {
  const isDark = variant === "dark";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-sm",
          isDark ? "bg-white/10 ring-1 ring-white/15" : "bg-brand",
        )}
      >
        <svg
          viewBox="0 0 32 32"
          className="h-6 w-6"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="7"
            width="3"
            height="18"
            rx="1"
            fill={isDark ? "#F4B740" : "#FFFFFF"}
          />
          <rect
            x="9.5"
            y="7"
            width="2"
            height="18"
            rx="1"
            fill={isDark ? "#FFFFFF" : "#A7E3C9"}
          />
          <rect
            x="14"
            y="7"
            width="4"
            height="18"
            rx="1"
            fill={isDark ? "#F4B740" : "#FFFFFF"}
          />
          <rect
            x="20.5"
            y="7"
            width="2"
            height="18"
            rx="1"
            fill={isDark ? "#FFFFFF" : "#A7E3C9"}
          />
          <rect
            x="25"
            y="7"
            width="3"
            height="18"
            rx="1"
            fill={isDark ? "#F4B740" : "#FFFFFF"}
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="leading-none">
          <span
            className={cn(
              "block text-lg font-bold tracking-tight",
              isDark ? "text-white" : "text-ink",
            )}
          >
            Sari<span className={isDark ? "text-accent" : "text-brand"}>Scan</span>
          </span>
          <span
            className={cn(
              "mt-1 block text-[10px] font-semibold tracking-[0.18em] uppercase",
              isDark ? "text-white/50" : "text-muted",
            )}
          >
            Scan · Weight · Price
          </span>
        </span>
      ) : null}
    </span>
  );
}
