import { prisma } from "@/lib/prisma";
import { appSettingsSchema } from "@/lib/validation";

export const DEFAULT_APP_SETTINGS = {
  storeName: "SariScan",
  currency: "PHP",
  currencySymbol: "₱",
  lowStockThreshold: 10,
  scanEnabled: true,
  scanSourceLabel: "WEB",
};

export type AppSettings = typeof DEFAULT_APP_SETTINGS;

const SETTINGS_KEY = "app";

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!row || typeof row.value !== "object" || row.value === null) {
      return DEFAULT_APP_SETTINGS;
    }

    const parsed = appSettingsSchema.safeParse({
      ...DEFAULT_APP_SETTINGS,
      ...(row.value as Record<string, unknown>),
    });

    return parsed.success ? parsed.data : DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error("[settings] failed to load settings", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings) {
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: settings },
    create: { key: SETTINGS_KEY, value: settings },
  });

  return settings;
}
