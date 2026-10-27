import type { Presence, Who } from "./db/schema";

// Starter layout for a two-story townhouse with a basement. The first
// walkthrough confirms, renames or removes these. House-specific details
// (address, size, year built) are not here: they load from data/home.local.json,
// which stays out of the public repo.

export type SeedArea = { name: string; kind: "indoor" | "outdoor"; present?: Presence };

export const SEED_AREAS: SeedArea[] = [
  { name: "Kitchen", kind: "indoor" },
  { name: "Living room", kind: "indoor" },
  { name: "Dining room", kind: "indoor" },
  { name: "Family room", kind: "indoor", present: "unknown" },
  { name: "Primary bedroom", kind: "indoor" },
  { name: "Other bedrooms", kind: "indoor" },
  { name: "Full bath 1", kind: "indoor" },
  { name: "Full bath 2", kind: "indoor" },
  { name: "Half bath", kind: "indoor" },
  { name: "Laundry", kind: "indoor" },
  { name: "Basement", kind: "indoor" },
  { name: "Attic", kind: "indoor" },
  { name: "Halls and stairs", kind: "indoor" },
  { name: "Roof", kind: "outdoor" },
  { name: "Gutters and downspouts", kind: "outdoor" },
  { name: "Siding and trim", kind: "outdoor" },
  { name: "Windows and doors", kind: "outdoor" },
  { name: "Deck or patio", kind: "outdoor", present: "unknown" },
  { name: "Parking and walkways", kind: "outdoor" },
  { name: "Yard and landscaping", kind: "outdoor" },
  { name: "Fence", kind: "outdoor", present: "unknown" },
];

export type SeedSystem = {
  name: string;
  area: string;
  category: string;
  expectedLifeYears?: number;
  present?: Presence;
};

export const SEED_SYSTEMS: SeedSystem[] = [
  { name: "Furnace or heat pump", area: "Basement", category: "Heating and cooling", expectedLifeYears: 15 },
  { name: "Air conditioner", area: "Yard and landscaping", category: "Heating and cooling", expectedLifeYears: 15 },
  { name: "Water heater", area: "Basement", category: "Plumbing", expectedLifeYears: 12 },
  { name: "Plumbing and main shutoff", area: "Basement", category: "Plumbing" },
  { name: "Electrical panel", area: "Basement", category: "Electrical", expectedLifeYears: 40 },
  { name: "Sump pump", area: "Basement", category: "Plumbing", expectedLifeYears: 10, present: "unknown" },
  { name: "Smoke and CO alarms", area: "Halls and stairs", category: "Safety", expectedLifeYears: 10 },
  { name: "Kitchen appliances", area: "Kitchen", category: "Appliances", expectedLifeYears: 12 },
  { name: "Washer and dryer", area: "Laundry", category: "Appliances", expectedLifeYears: 12 },
  { name: "Roof covering", area: "Roof", category: "Exterior", expectedLifeYears: 25 },
  { name: "Windows", area: "Windows and doors", category: "Exterior", expectedLifeYears: 30 },
  { name: "Irrigation", area: "Yard and landscaping", category: "Exterior", expectedLifeYears: 20, present: "unknown" },
  { name: "Fireplace and chimney", area: "Living room", category: "Heating and cooling", present: "unknown" },
  { name: "Radon fan", area: "Basement", category: "Safety", expectedLifeYears: 10, present: "unknown" },
];

export type SeedPlan = {
  title: string;
  system?: string;
  area?: string;
  intervalMonths: number;
  bestMonths?: number[];
  who: Who;
  howTo?: string;
};

// The spec's starter maintenance checklist, timed for Maryland weather.
export const SEED_PLANS: SeedPlan[] = [
  { title: "Replace furnace or AC filter", system: "Furnace or heat pump", intervalMonths: 3, who: "diy", howTo: "The filter size is printed on the edge of the old one." },
  { title: "Test smoke and CO alarms", system: "Smoke and CO alarms", intervalMonths: 1, who: "diy", howTo: "Press and hold each alarm's test button until it sounds." },
  { title: "Clean dishwasher filter", system: "Kitchen appliances", intervalMonths: 1, who: "diy" },
  { title: "Test GFCI outlets", system: "Electrical panel", intervalMonths: 3, who: "diy", howTo: "Press TEST, check the power cuts off, then press RESET." },
  { title: "Clean range hood filter", system: "Kitchen appliances", intervalMonths: 3, who: "diy" },
  { title: "Replace fridge water filter", system: "Kitchen appliances", intervalMonths: 6, who: "diy" },
  { title: "Test sump pump", system: "Sump pump", intervalMonths: 6, bestMonths: [3, 9], who: "diy", howTo: "Pour a bucket of water into the pit; the pump should start and drain it." },
  { title: "Clean gutters and downspouts", area: "Gutters and downspouts", intervalMonths: 6, bestMonths: [4, 11], who: "either" },
  { title: "AC tune-up", system: "Air conditioner", intervalMonths: 12, bestMonths: [4, 5], who: "pro" },
  { title: "Furnace or heat pump tune-up", system: "Furnace or heat pump", intervalMonths: 12, bestMonths: [9, 10], who: "pro" },
  { title: "Reopen outdoor faucets", system: "Plumbing and main shutoff", intervalMonths: 12, bestMonths: [4], who: "diy" },
  { title: "Shut off and drain outdoor faucets", system: "Plumbing and main shutoff", intervalMonths: 12, bestMonths: [10], who: "diy", howTo: "Close each faucet's inside shutoff valve, then open the outside tap to drain it. Do it before the first freeze." },
  { title: "Winterize irrigation", system: "Irrigation", intervalMonths: 12, bestMonths: [10], who: "pro" },
  { title: "Inspect roof and flashing", system: "Roof covering", intervalMonths: 12, bestMonths: [4], who: "pro", howTo: "Also check after big storms." },
  { title: "Check grading and drainage at foundation", area: "Yard and landscaping", intervalMonths: 12, bestMonths: [4], who: "diy" },
  { title: "Termite inspection", area: "Basement", intervalMonths: 12, bestMonths: [4], who: "pro" },
  { title: "Inspect deck", area: "Deck or patio", intervalMonths: 12, bestMonths: [5, 6], who: "diy" },
  { title: "Check caulk and weatherstripping", area: "Windows and doors", intervalMonths: 12, bestMonths: [9, 10], who: "diy" },
  { title: "Chimney sweep, if fireplace is used", system: "Fireplace and chimney", intervalMonths: 12, bestMonths: [8], who: "pro" },
  { title: "Flush water heater, test relief valve", system: "Water heater", intervalMonths: 12, who: "either" },
  { title: "Clean dryer vent duct", system: "Washer and dryer", intervalMonths: 12, who: "either" },
  { title: "Clean fridge coils", system: "Kitchen appliances", intervalMonths: 12, who: "diy" },
  { title: "Exercise main water shutoff valve", system: "Plumbing and main shutoff", intervalMonths: 12, who: "diy", howTo: "Close it fully and reopen it, so it still works in an emergency." },
  { title: "Radon test", area: "Basement", intervalMonths: 24, bestMonths: [1, 2], who: "diy", howTo: "Use a short-term test kit with windows closed. Also test after basement work." },
  { title: "Reseal deck", area: "Deck or patio", intervalMonths: 30, bestMonths: [5, 6], who: "either" },
  { title: "Check water heater anode rod", system: "Water heater", intervalMonths: 36, who: "pro" },
  { title: "Replace CO alarms", system: "Smoke and CO alarms", intervalMonths: 72, who: "diy" },
  { title: "Replace smoke alarms", system: "Smoke and CO alarms", intervalMonths: 120, who: "diy" },
];
