import { TIME_ZONE } from "./dates";

// The weather at the house as the sign-in page's scene sees it: plain numbers
// that mix freely, so any combination (drizzle at dusk, snow under a full moon,
// smoky heat) draws itself. No place names or coordinates in here.

export type Sky = {
  tempF: number;
  /** Percent of the sky covered. */
  cloud: number;
  /** Millimetres per hour. */
  rain: number;
  /** Centimetres per hour. */
  snow: number;
  /** Miles per hour. */
  wind: number;
  gusts: number;
  /** 0 is clear, 100 is thick fog. Worked out from visibility. */
  fog: number;
  /** US air quality index. Over 100 is hazy, over 150 smoky. */
  aqi: number;
  thunder: boolean;
  hail: boolean;
  freezing: boolean;
  rainJustStopped: boolean;
  /** Hours since midnight, house time. */
  sunrise: number;
  sunset: number;
};

export type Season = "winter" | "spring" | "summer" | "autumn";

/** Without live weather the scene still follows the clock: a mild, clear day. */
export const CALM_SKY: Sky = {
  tempF: 60,
  cloud: 10,
  rain: 0,
  snow: 0,
  wind: 4,
  gusts: 6,
  fog: 0,
  aqi: 20,
  thunder: false,
  hail: false,
  freezing: false,
  rainJustStopped: false,
  sunrise: 6.75,
  sunset: 18.25,
};

/** Hours since midnight in the house's time zone, with minutes as a fraction. */
export function houseHours(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("hour") + part("minute") / 60;
}

export function seasonOf(now = new Date()): Season {
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "numeric" }).format(now));
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/** Where the moon is in its cycle: 0 is new, 0.5 is full. */
export function moonPhase(now = new Date()): number {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (now.getTime() - knownNewMoon) / 86_400_000;
  return (((days % synodic) + synodic) % synodic) / synodic;
}

export function isDaytime(sky: Sky, hour: number): boolean {
  return hour >= sky.sunrise && hour <= sky.sunset;
}

export type SkyIcon = "sun" | "moon" | "cloud" | "rain" | "snow" | "storm" | "fog" | "smoke" | "rainbow";

/** A few words for the weather chip, like "Freezing drizzle, breezy". */
export function describeSky(sky: Sky, hour: number): { label: string; icon: SkyIcon } {
  const day = isDaytime(sky, hour);
  const freezing = sky.freezing || sky.tempF <= 32;
  let label: string;
  let icon: SkyIcon;
  if (sky.thunder) {
    label = sky.hail ? "Thunderstorm with hail" : "Thunderstorm";
    icon = "storm";
  } else if (sky.snow > 0) {
    label = sky.snow < 0.5 ? "Light snow" : sky.snow < 2 ? "Snow" : "Heavy snow";
    if (sky.snow >= 2 && sky.wind > 35) label = "Blizzard";
    icon = "snow";
  } else if (sky.rain > 0) {
    if (freezing) label = sky.rain < 0.5 ? "Freezing drizzle" : "Freezing rain";
    else label = sky.rain < 0.5 ? "Drizzle" : sky.rain < 2.5 ? "Light rain" : sky.rain < 7.6 ? "Rain" : "Heavy rain";
    icon = "rain";
  } else if (sky.rainJustStopped && day && sky.cloud < 80) {
    label = "Rain's passing, rainbow out";
    icon = "rainbow";
  } else if (sky.fog > 60) {
    label = "Fog";
    icon = "fog";
  } else if (sky.fog > 25) {
    label = "Mist";
    icon = "fog";
  } else if (sky.aqi > 150) {
    label = "Smoky";
    icon = "smoke";
  } else if (sky.aqi > 100) {
    label = "Hazy";
    icon = "smoke";
  } else if (sky.cloud < 15) {
    label = day ? "Sunny" : "Clear night";
    icon = day ? "sun" : "moon";
  } else if (sky.cloud < 40) {
    label = day ? "Mostly sunny" : "Mostly clear";
    icon = day ? "sun" : "moon";
  } else {
    label = sky.cloud < 75 ? "Partly cloudy" : sky.cloud < 90 ? "Mostly cloudy" : "Overcast";
    icon = "cloud";
  }
  if (label !== "Blizzard") {
    if (sky.wind > 30) label += ", very windy";
    else if (sky.wind > 18) label += ", breezy";
  }
  if (sky.tempF >= 95) label += ", very hot";
  if (sky.tempF <= 10) label += ", bitter cold";
  return { label, icon };
}

export type SkyExample = Partial<Sky> & { hour?: number; season?: Season; moon?: number };

/** Mixes for trying the scene in development: /login?sky=storm. Ignored in production. */
export const SKY_EXAMPLES: Record<string, SkyExample> = {
  clear: { hour: 9.5, cloud: 5, wind: 6, tempF: 52, season: "autumn" },
  "fog-sunrise": { hour: 7.75, sunrise: 7.5, cloud: 25, wind: 2, tempF: 44, fog: 80 },
  drizzle: { hour: 17.9, sunset: 18.1, cloud: 92, rain: 0.3, wind: 8, tempF: 55, fog: 15 },
  storm: { hour: 15.5, cloud: 100, rain: 9, wind: 38, gusts: 50, tempF: 79, thunder: true, hail: true, season: "summer" },
  "snow-night": { hour: 22, cloud: 35, snow: 1.4, wind: 5, tempF: 26, moon: 0.5, season: "winter" },
  "freezing-rain": { hour: 8.5, cloud: 100, rain: 2, wind: 10, tempF: 30, freezing: true, season: "winter" },
  blizzard: { hour: 13, cloud: 100, snow: 4.6, wind: 46, gusts: 60, tempF: 16, fog: 55, season: "winter" },
  "heat-haze": { hour: 15, cloud: 15, wind: 4, tempF: 98, aqi: 135, season: "summer" },
  smoke: { hour: 12, cloud: 10, wind: 7, tempF: 82, aqi: 265, season: "summer" },
  fireflies: { hour: 21.5, sunset: 20.5, cloud: 10, wind: 3, tempF: 76, moon: 0.2, season: "summer" },
  rainbow: { hour: 16.25, cloud: 45, wind: 9, tempF: 64, rainJustStopped: true, season: "spring" },
  windy: { hour: 11, cloud: 10, wind: 44, gusts: 55, tempF: 58 },
  frozen: { hour: 2, cloud: 0, wind: 4, tempF: 8, moon: 0.8, season: "winter" },
  overcast: { hour: 13, cloud: 100, wind: 0, tempF: 49, fog: 10 },
};
