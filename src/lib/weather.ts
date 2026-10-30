import "server-only";
import { TIME_ZONE } from "./dates";
import type { Sky } from "./sky";

// Live weather at the house from Open-Meteo, which is free and needs no key.
// WEATHER_LAT and WEATHER_LON stay on the server, rounded to about 1 km before
// they're sent; the page only ever gets the conditions. Fetched at most every
// 15 minutes, and the last good reading is kept if a fetch fails.

const FRESH_MS = 15 * 60 * 1000;
const RETRY_MS = 2 * 60 * 1000;

let last: { sky: Sky | null; at: number; ok: boolean } | null = null;
let pending: Promise<Sky | null> | null = null;

function place(): { latitude: string; longitude: string } | null {
  const lat = Number(process.env.WEATHER_LAT);
  const lon = Number(process.env.WEATHER_LON);
  if (!process.env.WEATHER_LAT || !process.env.WEATHER_LON || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat.toFixed(2), longitude: lon.toFixed(2) };
}

/** The weather at the house now, or null when no location is set or the service can't be reached. */
export async function houseSky(): Promise<Sky | null> {
  const where = place();
  if (!where) return null;
  if (last && Date.now() - last.at < (last.ok ? FRESH_MS : RETRY_MS)) return last.sky;
  pending ??= fetchSky(where)
    .then((sky) => {
      last = { sky, at: Date.now(), ok: true };
      return sky;
    })
    .catch((err) => {
      console.warn("[weather]", err instanceof Error ? err.message : err);
      last = { sky: last?.sky ?? null, at: Date.now(), ok: false };
      return last.sky;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

type Forecast = {
  current: {
    interval?: number;
    temperature_2m: number;
    weather_code: number;
    cloud_cover: number;
    rain: number;
    showers: number;
    snowfall: number;
    visibility: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  minutely_15?: { precipitation?: (number | null)[] };
  daily?: { sunrise?: string[]; sunset?: string[] };
};

type AirQuality = { current?: { us_aqi?: number | null } };

// The model's weather code sometimes says rain or snow while the measured amount
// for the last 15 minutes is still zero. These keep the picture and the words in step.
const RAIN_BY_CODE: Record<number, number> = {
  51: 0.2, 53: 0.4, 55: 0.6, 56: 0.3, 57: 0.6, 61: 1, 63: 4, 65: 9, 66: 1.5, 67: 5, 80: 1, 81: 4, 82: 9, 95: 4, 96: 6, 99: 9,
};
const SNOW_BY_CODE: Record<number, number> = { 71: 0.4, 73: 1.5, 75: 3.5, 77: 0.3, 85: 1, 86: 3 };
const CLOUD_BY_CODE: Record<number, number> = { 1: 15, 2: 40, 3: 90 };

async function getJson<T>(url: URL): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) throw new Error(`${url.host} answered ${res.status}`);
  return (await res.json()) as T;
}

function hoursOf(isoLocal: string | undefined, fallback: number): number {
  const m = isoLocal?.match(/T(\d\d):(\d\d)/);
  return m ? Number(m[1]) + Number(m[2]) / 60 : fallback;
}

/** Visibility in metres to 0–100 fog: 10 km or more is clear, 200 m or less is thick. */
function fogFrom(visibility: number, code: number): number {
  const v = Math.max(50, visibility || 50_000);
  const fog = ((4 - Math.log10(v)) / (4 - Math.log10(200))) * 100;
  return Math.round(Math.min(100, Math.max(code === 45 || code === 48 ? 70 : 0, fog)));
}

async function fetchSky(where: { latitude: string; longitude: string }): Promise<Sky> {
  const forecast = new URL("https://api.open-meteo.com/v1/forecast");
  forecast.search = new URLSearchParams({
    ...where,
    current: "temperature_2m,weather_code,cloud_cover,rain,showers,snowfall,visibility,wind_speed_10m,wind_gusts_10m",
    minutely_15: "precipitation",
    past_minutely_15: "4",
    forecast_minutely_15: "0",
    daily: "sunrise,sunset",
    forecast_days: "1",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: TIME_ZONE,
  }).toString();
  const air = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  air.search = new URLSearchParams({ ...where, current: "us_aqi", timezone: TIME_ZONE }).toString();

  const [f, a] = await Promise.all([getJson<Forecast>(forecast), getJson<AirQuality>(air).catch(() => null)]);
  const c = f.current;
  const code = c.weather_code;
  // Amounts are for the last reading's interval (15 minutes); the scene wants per hour.
  const perHour = 3600 / (c.interval || 900);
  const thunder = code >= 95;
  const rain = Math.max((c.rain + c.showers) * perHour, RAIN_BY_CODE[code] ?? 0);
  const snow = Math.max(c.snowfall * perHour, SNOW_BY_CODE[code] ?? 0);
  const lastHour = (f.minutely_15?.precipitation ?? []).reduce<number>((sum, x) => sum + (x ?? 0), 0);
  let cloud = Math.max(c.cloud_cover, CLOUD_BY_CODE[code] ?? 0);
  if (rain > 0 || snow > 0) cloud = Math.max(cloud, 70);

  return {
    tempF: Math.round(c.temperature_2m),
    cloud: Math.round(cloud),
    rain: Math.round(rain * 10) / 10,
    snow: Math.round(snow * 10) / 10,
    wind: Math.round(c.wind_speed_10m),
    gusts: Math.round(c.wind_gusts_10m),
    fog: fogFrom(c.visibility, code),
    aqi: Math.round(a?.current?.us_aqi ?? 20),
    thunder,
    hail: code === 96 || code === 99,
    freezing: [56, 57, 66, 67].includes(code),
    rainJustStopped: lastHour > 0.1 && rain === 0 && snow === 0 && !thunder,
    sunrise: hoursOf(f.daily?.sunrise?.[0], 6.75),
    sunset: hoursOf(f.daily?.sunset?.[0], 18.25),
  };
}
