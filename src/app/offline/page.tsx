import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-dark px-6 text-center">
      <Logo variant="dark" />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <WifiOff className="h-7 w-7 text-accent" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-white">You are offline</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        SariScan needs an internet connection to look up live prices. Reconnect
        and try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition hover:bg-[#e5a52d]"
      >
        Retry
      </Link>
    </div>
  );
}
