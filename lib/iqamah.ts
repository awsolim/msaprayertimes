export type PrayerName =
  | "Fajr"
  | "Sunrise"
  | "Dhuhr"
  | "Asr"
  | "Maghrib"
  | "Isha";

export type IqamahRule =
  | { type: "offset"; minutes: number }
  | { type: "fixed"; time: string }
  | { type: "none" };

export type IqamahRules = Record<PrayerName, IqamahRule>;

type IqamahSettingsRow = {
  prayer: PrayerName;
  rule_type: "offset" | "fixed" | "none";
  offset_minutes: number | null;
  fixed_time: string | null;
};

export const prayerNames: PrayerName[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

export const fallbackIqamahRules: IqamahRules = {
  Fajr: { type: "offset", minutes: 30 },
  Sunrise: { type: "none" },
  Dhuhr: { type: "fixed", time: "14:00" },
  Asr: { type: "offset", minutes: 5 },
  Maghrib: { type: "offset", minutes: 5 },
  Isha: { type: "fixed", time: "21:30" },
};

export async function loadIqamahRules(
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<IqamahRules> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/iqamah_settings?select=prayer,rule_type,offset_minutes,fixed_time`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Cache-Control": "no-cache",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase returned HTTP ${response.status}`);
    }

    const rows = (await response.json()) as IqamahSettingsRow[];
    const rules: IqamahRules = { ...fallbackIqamahRules };

    for (const row of rows) {
      if (!prayerNames.includes(row.prayer)) continue;

      if (row.rule_type === "offset" && row.offset_minutes !== null) {
        rules[row.prayer] = { type: "offset", minutes: row.offset_minutes };
      } else if (row.rule_type === "fixed" && row.fixed_time) {
        rules[row.prayer] = { type: "fixed", time: row.fixed_time };
      } else if (row.rule_type === "none") {
        rules[row.prayer] = { type: "none" };
      }
    }

    return rules;
  } catch (error) {
    console.error("Unable to load iqamah settings; using fallback rules:", error);
    return { ...fallbackIqamahRules };
  }
}

