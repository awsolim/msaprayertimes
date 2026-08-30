import { useEffect, useState } from "react";

export type DisplayModuleKey = "countdown" | "events" | "hadith";

export type DisplayModuleConfig = {
  key: DisplayModuleKey;
  enabled: boolean;
  order: number;
  durationSeconds: number;
};

export type DisplayConfig = {
  themeName: string;
  logoUrl: string | null;
  eventsQrImageUrl: string | null;
  eventsSignupUrl: string | null;
  showLogo: boolean;
  modules: DisplayModuleConfig[];
};

type SettingsRow = {
  theme_name?: string;
  logo_url?: string | null;
  events_qr_image_url?: string | null;
  events_signup_url?: string | null;
  show_logo?: boolean;
};

type ModuleRow = {
  module_key?: string;
  enabled?: boolean;
  display_order?: number;
  duration_seconds?: number;
};

export const defaultDisplayConfig: DisplayConfig = {
  themeName: import.meta.env.VITE_THEME ?? "green-red",
  logoUrl: null,
  eventsQrImageUrl: null,
  eventsSignupUrl: null,
  showLogo: false,
  modules: [
    { key: "hadith", enabled: true, order: 1, durationSeconds: 10 },
    { key: "events", enabled: true, order: 2, durationSeconds: 10 },
    { key: "countdown", enabled: true, order: 3, durationSeconds: 10 },
  ],
};

const moduleKeys: DisplayModuleKey[] = ["countdown", "events", "hadith"];

function normalizeConfig(payload: unknown): DisplayConfig {
  if (!payload || typeof payload !== "object") return defaultDisplayConfig;

  const raw = payload as { settings?: SettingsRow | null; modules?: ModuleRow[] };
  const settings = raw.settings;
  const modules = Array.isArray(raw.modules)
    ? raw.modules
        .filter(
          (row): row is ModuleRow & { module_key: DisplayModuleKey } =>
            typeof row.module_key === "string" &&
            moduleKeys.includes(row.module_key as DisplayModuleKey),
        )
        .map((row) => ({
          key: row.module_key,
          enabled: row.enabled !== false,
          order: Number.isFinite(row.display_order) ? Number(row.display_order) : 99,
          durationSeconds: Math.min(
            300,
            Math.max(5, Number(row.duration_seconds) || 10),
          ),
        }))
        .sort((a, b) => a.order - b.order)
    : [];

  return {
    themeName: settings?.theme_name || defaultDisplayConfig.themeName,
    logoUrl: settings?.logo_url || null,
    eventsQrImageUrl: settings?.events_qr_image_url || null,
    eventsSignupUrl: settings?.events_signup_url || null,
    showLogo: settings?.show_logo === true,
    modules: modules.length > 0 ? modules : defaultDisplayConfig.modules,
  };
}

export default function useDisplayConfig() {
  const [config, setConfig] = useState<DisplayConfig>(defaultDisplayConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/display-config", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextConfig = normalizeConfig(await response.json());
        if (!cancelled) {
          setConfig(nextConfig);
          setError(null);
        }
      } catch (loadError) {
        console.error("Unable to load display configuration; using defaults:", loadError);
        if (!cancelled) setError("Using built-in display settings");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, error };
}

