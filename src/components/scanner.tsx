"use client";

import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  History,
  Keyboard,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ScanBarcode,
  Search,
  SwitchCamera,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";
import {
  BrowserCodeReader,
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth-provider";
import { Alert, Badge, Button, Card, Spinner, inputClass } from "@/components/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import {
  formatCurrency,
  formatDateTime,
  formatWeight,
  sellingUnitLabels,
} from "@/lib/format";
import type {
  ScanLookupResult,
  WeightUnit,
} from "@/lib/types";
import { cn } from "@/lib/cn";

type CameraState = "idle" | "starting" | "on" | "error";
type Tab = "camera" | "manual";

type HistoryItem = {
  barcode: string;
  name: string;
  price: number | null;
  symbol: string;
  weight: number | null;
  weightUnit: WeightUnit;
  at: string;
};

const HISTORY_KEY = "sariscan.history.v1";
const EMPTY_HISTORY: HistoryItem[] = [];
let historyCache: HistoryItem[] | null = null;
const historyListeners = new Set<() => void>();

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera permission in your browser settings and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. You can still type the barcode manually.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "Could not start the camera. Use manual entry or try again.";
  }
}

function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function getHistorySnapshot() {
  if (historyCache === null) historyCache = readHistory();
  return historyCache;
}

function getServerHistorySnapshot() {
  return EMPTY_HISTORY;
}

function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== HISTORY_KEY) return;
    historyCache = readHistory();
    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    historyListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeHistory(items: HistoryItem[]) {
  historyCache = items;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(HISTORY_KEY);
    } else {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    }
  } catch {
    // Storage may be full or unavailable.
  }
  historyListeners.forEach((listener) => listener());
}

function AuthGate() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="pointer-events-none absolute inset-0 scanner-grid opacity-[0.08]" />
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-brand/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl px-4 pt-5 pb-28 sm:px-6">
          <div className="flex items-center justify-between">
            <Logo variant="dark" />
            <Link
              href="/login?next=/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:text-sm"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-12 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">
              <ScanBarcode className="h-3.5 w-3.5 text-accent" />
              Private store workspace
            </span>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight text-white sm:text-5xl">
              Your store&apos;s catalog.
              <br />
              <span className="text-accent">Only your data.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              Sign in to scan barcodes, record products, and download your own
              inventory PDF. Every account has a separate store workspace.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-16 w-full max-w-3xl px-4 pb-16 sm:px-6">
        <Card className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <LayoutDashboard className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Sign in to your store
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Use your store account to access your products and scan
                history. New here? Create an account and get your own private
                workspace.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/login?next=/" className="flex-1">
              <Button size="lg" className="w-full">
                <LayoutDashboard className="h-4 w-4" />
                Sign in
              </Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button variant="secondary" size="lg" className="w-full">
                <UserPlus className="h-4 w-4" />
                Create store account
              </Button>
            </Link>
          </div>
        </Card>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            "Separate data for every store",
            "Scan or add products manually",
            "Download inventory as PDF",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-xs font-medium text-muted"
            >
              {item}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function Scanner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lookupLockRef = useRef(false);
  const pausedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const [tab, setTab] = useState<Tab>("camera");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [manualCode, setManualCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<ScanLookupResult | null>(null);
  const [missingBarcode, setMissingBarcode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      BrowserCodeReader.releaseAllStreams();
      audioRef.current?.close().catch(() => undefined);
    };
  }, []);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    } catch {
      // Audio feedback is optional.
    }
  }, []);

  const feedback = useCallback((success: boolean) => {
    try {
      const context = audioRef.current;
      if (context) {
        context.resume().catch(() => undefined);
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = success ? 920 : 240;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.12,
          context.currentTime + 0.01,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.12,
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.14);
      }
    } catch {
      // Ignore audio failures.
    }

    try {
      navigator.vibrate?.(success ? 55 : [35, 45, 35]);
    } catch {
      // Ignore vibration failures.
    }
  }, []);

  const pushHistory = useCallback((data: ScanLookupResult) => {
    const item: HistoryItem = {
      barcode: data.product.barcode,
      name: data.product.name,
      price: data.product.price,
      symbol: data.store.currencySymbol,
      weight: data.product.weight,
      weightUnit: data.product.weightUnit,
      at: data.scannedAt,
    };

    const next = [
      item,
      ...getHistorySnapshot().filter((entry) => entry.barcode !== item.barcode),
    ].slice(0, 5);
    writeHistory(next);
  }, []);

  const scrollToResult = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const lookup = useCallback(
    async (rawBarcode: string) => {
      const barcode = rawBarcode.trim();
      if (!barcode || lookupLockRef.current) return;

      lookupLockRef.current = true;
      pausedRef.current = true;
      setLookingUp(true);
      setLookupError(null);
      setMissingBarcode(null);
      setResult(null);
      ensureAudio();

      try {
        const data = await apiFetch<ScanLookupResult>(
          `/scan/${encodeURIComponent(barcode)}?source=APP`,
        );
        setResult(data);
        setManualCode("");
        pushHistory(data);
        feedback(true);
        scrollToResult();
      } catch (error) {
        feedback(false);
        if (
          error instanceof ApiClientError &&
          (error.status === 404 || error.code === "NOT_FOUND")
        ) {
          setMissingBarcode(barcode);
        } else {
          setLookupError(
            error instanceof ApiClientError
              ? error.message
              : "The lookup failed. Please try again.",
          );
        }
        scrollToResult();
      } finally {
        setLookingUp(false);
      }
    },
    [ensureAudio, feedback, pushHistory, scrollToResult],
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setTorchAvailable(false);
    setTorchOn(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("idle");
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user" = facingMode) => {
      if (!videoRef.current) return;

      setCameraError(null);
      setCameraState("starting");
      controlsRef.current?.stop();
      controlsRef.current = null;
      ensureAudio();

      try {
        const reader =
          readerRef.current ?? new BrowserMultiFormatReader(undefined, {
            delayBetweenScanAttempts: 180,
            delayBetweenScanSuccess: 800,
          });
        readerRef.current = reader;

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (scanResult) => {
            if (!scanResult) return;
            if (lookupLockRef.current || pausedRef.current) return;
            void lookup(scanResult.getText());
          },
        );

        controlsRef.current = controls;
        setTorchAvailable(typeof controls.switchTorch === "function");
        setCameraState("on");
      } catch (error) {
        console.error("[scanner] camera failed", error);
        setCameraError(cameraErrorMessage(error));
        setCameraState("error");
      }
    },
    [ensureAudio, facingMode, lookup],
  );

  const flipCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setTorchOn(false);
    await startCamera(next);
  }, [facingMode, startCamera]);

  const toggleTorch = useCallback(async () => {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    try {
      await controls.switchTorch(!torchOn);
      setTorchOn((value) => !value);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const selectTab = useCallback(
    (next: Tab) => {
      setTab(next);
      if (next === "manual") {
        stopCamera();
      }
    },
    [stopCamera],
  );

  const scanNext = useCallback(() => {
    setResult(null);
    setMissingBarcode(null);
    setLookupError(null);
    setManualCode("");
    lookupLockRef.current = false;
    pausedRef.current = false;

    if (tab === "camera" && cameraState !== "on") {
      void startCamera();
    }
  }, [cameraState, startCamera, tab]);

  const submitManual = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const barcode = manualCode.trim();
      if (!barcode) return;

      if (cameraState === "on") {
        controlsRef.current?.stop();
        controlsRef.current = null;
        setCameraState("idle");
        setTorchOn(false);
      }

      void lookup(barcode);
    },
    [cameraState, lookup, manualCode],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading your store…
        </div>
      </div>
    );
  }

  if (!user) return <AuthGate />;

  const resultVisible = Boolean(result || missingBarcode || lookupError);

  return (
    <div className="min-h-screen bg-paper">
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="pointer-events-none absolute inset-0 scanner-grid opacity-[0.08]" />
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-brand/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-5xl px-4 pt-5 pb-24 sm:px-6">
          <div className="flex items-center justify-between">
            <Logo variant="dark" />
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            </div>
          </div>

          <div className="mt-9 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Barcode price checker
            </span>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight text-white sm:text-5xl">
              I-scan. Alamin agad ang
              <br className="hidden sm:block" />{" "}
              <span className="text-accent">timbang at presyo.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              Point your phone camera at any barcode — or type it in manually
              — and SariScan instantly shows the product name, net weight and
              current price.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-16 w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex rounded-xl bg-paper p-1">
                <button
                  type="button"
                  onClick={() => selectTab("camera")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
                    tab === "camera"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("manual")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
                    tab === "manual"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <Keyboard className="h-4 w-4" />
                  Manual
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    cameraState === "on"
                      ? "animate-pulse bg-brand"
                      : cameraState === "error"
                        ? "bg-danger"
                        : "bg-line",
                  )}
                />
                {cameraState === "on"
                  ? "Scanner live"
                  : cameraState === "starting"
                    ? "Starting…"
                    : cameraState === "error"
                      ? "Camera issue"
                      : "Camera idle"}
              </div>
            </div>

            {tab === "camera" ? (
              <>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#06140e] sm:aspect-[16/11]">
                  <video
                    ref={videoRef}
                    className={cn(
                      "h-full w-full object-cover transition-opacity duration-300",
                      cameraState === "on" ? "opacity-100" : "opacity-0",
                    )}
                    muted
                    playsInline
                    autoPlay
                  />

                  {cameraState === "on" ? (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 sm:p-12">
                        <div className="relative h-full max-h-56 w-full max-w-md">
                          <span className="absolute top-0 left-0 h-8 w-8 rounded-tl-xl border-t-[3px] border-l-[3px] border-accent" />
                          <span className="absolute top-0 right-0 h-8 w-8 rounded-tr-xl border-t-[3px] border-r-[3px] border-accent" />
                          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-accent" />
                          <span className="absolute right-0 bottom-0 h-8 w-8 rounded-br-xl border-r-[3px] border-b-[3px] border-accent" />
                          {!resultVisible ? (
                            <span className="absolute inset-x-0 top-0 h-0.5 animate-scan-line bg-accent/80 shadow-[0_0_18px_rgba(244,183,64,0.7)]" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/45 backdrop-blur-[2px]">
                              <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/20">
                                Scan paused — tap “Scan next”
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {torchAvailable ? (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/60"
                            aria-label="Toggle flashlight"
                          >
                            {torchOn ? (
                              <FlashlightOff className="h-5 w-5" />
                            ) : (
                              <Flashlight className="h-5 w-5" />
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={flipCamera}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/60"
                          aria-label="Flip camera"
                        >
                          <SwitchCamera className="h-5 w-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      {cameraState === "starting" ? (
                        <>
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                            <Spinner className="h-6 w-6 text-accent" />
                          </div>
                          <p className="text-sm font-semibold text-white">
                            Starting the camera…
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            Allow camera access when your browser asks.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                            <Camera className="h-7 w-7 text-accent" />
                          </div>
                          <p className="text-base font-semibold text-white">
                            Ready when you are
                          </p>
                          <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/50">
                            Use your phone’s rear camera to scan EAN, UPC or
                            Code 128 barcodes.
                          </p>
                          <Button
                            onClick={() => startCamera()}
                            className="mt-5"
                            size="md"
                          >
                            <Camera className="h-4 w-4" />
                            Start camera
                          </Button>
                          {cameraState === "error" ? (
                            <>
                              <p className="mt-4 max-w-xs text-xs font-medium text-[#ffb4a8]">
                                {cameraError}
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="mt-3"
                                onClick={() => selectTab("manual")}
                              >
                                <Keyboard className="h-4 w-4" />
                                Type barcode manually
                              </Button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs text-muted">
                    Hold the barcode inside the frame. Scanning works best with
                    good lighting.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectTab("manual")}
                    >
                      <Keyboard className="h-4 w-4" />
                      Type manually
                    </Button>
                    {cameraState === "on" ? (
                      <Button variant="secondary" size="sm" onClick={stopCamera}>
                        <CameraOff className="h-4 w-4" />
                        Stop camera
                      </Button>
                    ) : cameraState === "starting" ? null : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startCamera()}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="px-4 py-6 sm:px-6">
                <div className="rounded-2xl border border-line bg-paper/60 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Keyboard className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Enter a barcode
                      </p>
                      <p className="text-xs text-muted">
                        Type the number printed under the barcode.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={submitManual} className="mt-4 flex gap-2">
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      value={manualCode}
                      onChange={(event) => setManualCode(event.target.value)}
                      placeholder="e.g. 4800016644933"
                      className={`${inputClass} font-mono tracking-wide`}
                      aria-label="Barcode"
                    />
                    <Button
                      type="submit"
                      disabled={!manualCode.trim() || lookingUp}
                    >
                      {lookingUp ? <Spinner /> : <Search className="h-4 w-4" />}
                      Look up
                    </Button>
                  </form>

                </div>

                <div className="mt-4 rounded-xl bg-brand-soft/70 px-3.5 py-3 text-xs leading-relaxed text-brand-dark">
                  <div className="flex items-start gap-2.5">
                    <ScanBarcode className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Product not in the database? Add it yourself from the
                      dashboard. Every product you save is recorded
                      automatically.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/admin/products?new=1")}
                  >
                    <Plus className="h-4 w-4" />
                    Add product manually
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div ref={resultRef} className="scroll-mt-4 space-y-5">
            {lookingUp ? (
              <Card className="animate-fade-up p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Spinner />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Looking up product…
                    </p>
                    <p className="text-xs text-muted">
                      Checking the store catalog.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-line" />
                  <div className="h-8 w-3/4 animate-pulse rounded-lg bg-line/80" />
                  <div className="h-3 w-40 animate-pulse rounded bg-line" />
                  <div className="h-16 w-full animate-pulse rounded-xl bg-line/60" />
                </div>
              </Card>
            ) : result ? (
              <Card className="overflow-hidden animate-fade-up">
                <div className="flex items-center justify-between gap-3 bg-brand px-5 py-3 text-white">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Product found
                  </span>
                  <span className="font-mono text-[11px] text-white/60">
                    {result.scannedAt
                      ? formatDateTime(result.scannedAt)
                      : ""}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {result.product.brand ? (
                      <Badge tone="green">{result.product.brand}</Badge>
                    ) : null}
                    {result.product.category ? (
                      <Badge tone="neutral">{result.product.category}</Badge>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-2xl leading-tight font-bold tracking-tight text-ink">
                    {result.product.name}
                  </h2>

                  <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-paper px-4 py-4">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                        Price
                      </p>
                      <p className="price-tabular mt-1 text-4xl font-bold text-brand-dark sm:text-[42px]">
                        <span className="mr-0.5 align-top text-xl font-semibold">
                          {result.store.currencySymbol}
                        </span>
                        {result.product.price !== null
                          ? result.product.price.toFixed(2)
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                        Net weight
                      </p>
                      <p className="price-tabular mt-1 text-xl font-bold text-ink">
                        {formatWeight(
                          result.product.weight,
                          result.product.weightUnit,
                        )}
                      </p>
                      <p className="text-[11px] text-muted">
                        per {sellingUnitLabels[result.product.sellingUnit].toLowerCase()}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-line px-3 py-2.5">
                      <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                        Barcode
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm font-semibold text-ink">
                        {result.product.barcode}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-line px-3 py-2.5">
                      <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                        Store
                      </dt>
                      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {result.store.name}
                      </dd>
                    </div>
                  </dl>

                  <Button onClick={scanNext} className="mt-5 w-full" size="lg">
                    <ScanBarcode className="h-5 w-5" />
                    Scan next item
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : missingBarcode ? (
              <Card className="animate-fade-up overflow-hidden">
                <div className="flex items-center gap-2 bg-accent-soft px-5 py-3 text-[#7a5200]">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Barcode not found
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-[#8a5b00]">
                    <ScanBarcode className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-ink">
                    Wala pang product para sa barcode na ito
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Walang naka-save na product para sa{" "}
                    <span className="font-mono font-semibold text-ink">
                      {missingBarcode}
                    </span>
                    . Add it now and it will be recorded in your inventory.
                  </p>
                  <div className="mt-5 grid gap-2">
                    <Button
                      onClick={() =>
                        router.push(
                          `/admin/products?new=1&barcode=${encodeURIComponent(missingBarcode)}`,
                        )
                      }
                      className="w-full"
                      size="lg"
                    >
                      <Plus className="h-5 w-5" />
                      Add this product
                    </Button>
                    <div className="flex gap-2">
                      <Button onClick={scanNext} className="flex-1">
                        <RefreshCw className="h-4 w-4" />
                        Try another
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => selectTab("manual")}
                      >
                        <Keyboard className="h-4 w-4" />
                        Manual
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : lookupError ? (
              <Card className="animate-fade-up p-5">
                <Alert tone="error" title="Lookup failed">
                  {lookupError}
                </Alert>
                <Button onClick={scanNext} className="mt-4 w-full">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
              </Card>
            ) : (
              <Card className="animate-fade-up p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <ScanBarcode className="h-7 w-7" />
                </div>
                <p className="mt-4 text-base font-semibold text-ink">
                  Your scan result will appear here
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Product name, net weight and price — instantly. Start the
                  camera or type a barcode to get going.
                </p>
                <div className="mt-5 grid gap-2">
                  {(history.length > 0
                    ? history.slice(0, 2)
                    : (["1", "2", "3"] as const).map((step) => ({
                        barcode: step,
                        name: [
                          "Open the camera or choose manual",
                          "Scan the product barcode",
                          "See the weight and price",
                        ][Number(step) - 1],
                        price: null,
                        symbol: "",
                        weight: null,
                        weightUnit: "NONE" as WeightUnit,
                        at: "",
                      }))
                  ).map((item, index) =>
                    item.at ? (
                      <button
                        key={item.barcode}
                        type="button"
                        onClick={() => void lookup(item.barcode)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-brand/30 hover:bg-brand-soft/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {item.name}
                          </span>
                          <span className="block font-mono text-[11px] text-muted">
                            {item.barcode}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-brand-dark">
                          {formatCurrency(item.price, item.symbol)}
                        </span>
                      </button>
                    ) : (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 text-sm text-ink-soft"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-bold text-brand">
                          {index + 1}
                        </span>
                        {item.name}
                      </div>
                    ),
                  )}
                </div>
              </Card>
            )}

            {history.length > 0 ? (
              <Card className="p-4">
                <div className="flex items-center justify-between px-1 pb-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                    <History className="h-3.5 w-3.5" />
                    Recent scans
                  </p>
                  <button
                    type="button"
                    onClick={() => writeHistory([])}
                    className="text-[11px] font-semibold text-muted transition hover:text-danger"
                  >
                    Clear
                  </button>
                </div>
                <div className="divide-y divide-line">
                  {history.map((item) => (
                    <button
                      key={`${item.barcode}-${item.at}`}
                      type="button"
                      onClick={() => void lookup(item.barcode)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:opacity-70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {item.name}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {formatWeight(item.weight, item.weightUnit)} ·{" "}
                          {formatDateTime(item.at)}
                        </span>
                      </span>
                      <span className="price-tabular shrink-0 text-sm font-bold text-brand-dark">
                        {formatCurrency(item.price, item.symbol)}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>SariScan. Built for sari-sari stores.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold text-ink-soft hover:text-brand">
              Scanner
            </Link>
            <Link
              href="/admin"
              className="font-semibold text-ink-soft hover:text-brand"
            >
              Dashboard
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
