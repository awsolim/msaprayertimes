export const themeNames = [
  "green-red",
  "navy-gold",
  "terracotta",
  "ocean",
  "charcoal",
  "crimson",
  "forest",
  "violet",
  "sandstone",
  "emerald-lantern",
  "sapphire-dawn",
  "obsidian-gold",
  "northern-lights",
  "plum-mint",
  "moonlit-marble",
  "desert-twilight",
  "ruby-noir",
  "celestial-indigo",
  "jade-ice",
  "bronze-night",
] as const;

export type ThemeName = (typeof themeNames)[number];

const DEFAULT_THEME: ThemeName = "green-red";

function isThemeName(value: string): value is ThemeName {
  return themeNames.includes(value as ThemeName);
}

export function applyTheme(runtimeTheme?: string): ThemeName {
  const previewTheme = new URLSearchParams(window.location.search).get("theme");
  const requestedTheme =
    previewTheme ?? runtimeTheme ?? import.meta.env.VITE_THEME ?? DEFAULT_THEME;
  const theme = isThemeName(requestedTheme) ? requestedTheme : DEFAULT_THEME;

  if (requestedTheme !== theme) {
    console.warn(
      `Unknown theme "${requestedTheme}". Using "${DEFAULT_THEME}" instead.`,
    );
  }

  document.documentElement.dataset.theme = theme;
  return theme;
}
