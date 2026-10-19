import { assertEquals } from "@std/assert";
import "../js/countdown.js";

type Parts = {
  sign: "until" | "since";
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type Modes = Partial<Record<keyof Omit<Parts, "sign">, "auto" | "show" | "hide">>;

const { breakdown, visibleUnits, UNITS } = (globalThis as unknown as {
  Countdown: {
    UNITS: string[];
    breakdown: (from: Date, to: Date) => Parts;
    visibleUnits: (parts: Parts, modes?: Modes) => string[];
  };
}).Countdown;

const local = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) => new Date(year, month - 1, day, hour, minute, second);

const parts = (overrides: Partial<Parts>): Parts => ({
  sign: "until",
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  ...overrides,
});

Deno.test("UNITS are ordered largest to smallest", () => {
  assertEquals(UNITS, ["years", "months", "days", "hours", "minutes", "seconds"]);
});

Deno.test("breakdown: identical instants are zero and count as until", () => {
  const moment = local(2026, 10, 19, 12);
  assertEquals(breakdown(moment, moment), parts({}));
});

Deno.test("breakdown: hours, minutes and seconds", () => {
  assertEquals(
    breakdown(local(2026, 10, 19, 12), local(2026, 10, 19, 15, 30, 7)),
    parts({ hours: 3, minutes: 30, seconds: 7 }),
  );
});

Deno.test("breakdown: years, months, days and time of day", () => {
  assertEquals(
    breakdown(local(2026, 10, 19, 12), local(2028, 1, 5, 8, 30, 15)),
    parts({ years: 1, months: 2, days: 16, hours: 20, minutes: 30, seconds: 15 }),
  );
});

Deno.test("breakdown: a past date is since, with the same magnitudes", () => {
  const earlier = local(2026, 10, 19, 12);
  const later = local(2028, 1, 5, 8, 30, 15);
  const until = breakdown(earlier, later);
  const since = breakdown(later, earlier);
  assertEquals(since, { ...until, sign: "since" });
});

Deno.test("breakdown: month end clamps to the last day of the shorter month", () => {
  assertEquals(
    breakdown(local(2026, 1, 31, 12), local(2026, 2, 28, 12)),
    parts({ months: 1 }),
  );
  assertEquals(
    breakdown(local(2026, 1, 31, 12), local(2026, 3, 1, 12)),
    parts({ months: 1, days: 1 }),
  );
});

Deno.test("breakdown: leap day to the next Feb 28 is one year", () => {
  assertEquals(
    breakdown(local(2024, 2, 29, 12), local(2025, 2, 28, 12)),
    parts({ years: 1 }),
  );
});

Deno.test("breakdown: days are calendar days across a DST change", () => {
  assertEquals(
    breakdown(local(2026, 3, 7, 12), local(2026, 3, 9, 12)),
    parts({ days: 2 }),
  );
});

Deno.test("visibleUnits: all zero shows only seconds", () => {
  assertEquals(visibleUnits(parts({})), ["seconds"]);
});

Deno.test("visibleUnits: under a minute shows only seconds", () => {
  assertEquals(visibleUnits(parts({ seconds: 45 })), ["seconds"]);
});

Deno.test("visibleUnits: leading zero units are hidden, later zeros are kept", () => {
  assertEquals(
    visibleUnits(parts({ hours: 3 })),
    ["hours", "minutes", "seconds"],
  );
  assertEquals(
    visibleUnits(parts({ days: 5 })),
    ["days", "hours", "minutes", "seconds"],
  );
  assertEquals(
    visibleUnits(parts({ months: 2 })),
    ["months", "days", "hours", "minutes", "seconds"],
  );
  assertEquals(
    visibleUnits(parts({ years: 1 })),
    ["years", "months", "days", "hours", "minutes", "seconds"],
  );
});

Deno.test("visibleUnits: more than 20 years hides hours, minutes and seconds", () => {
  assertEquals(
    visibleUnits(parts({ years: 23, months: 2, days: 12, hours: 12 })),
    ["years", "months", "days"],
  );
});

Deno.test("visibleUnits: exactly 20 years keeps every unit", () => {
  assertEquals(
    visibleUnits(parts({ years: 20 })),
    ["years", "months", "days", "hours", "minutes", "seconds"],
  );
});

Deno.test("visibleUnits: 20 years plus one second hides the small units", () => {
  assertEquals(
    visibleUnits(parts({ years: 20, seconds: 1 })),
    ["years", "months", "days"],
  );
});

Deno.test("visibleUnits: show forces a unit even past 20 years or at zero", () => {
  assertEquals(
    visibleUnits(parts({ years: 23 }), { hours: "show" }),
    ["years", "months", "days", "hours"],
  );
  assertEquals(
    visibleUnits(parts({ hours: 3 }), { years: "show" }),
    ["years", "hours", "minutes", "seconds"],
  );
});

Deno.test("visibleUnits: hide removes a unit", () => {
  assertEquals(
    visibleUnits(parts({ years: 2 }), { years: "hide" }),
    ["months", "days", "hours", "minutes", "seconds"],
  );
});

Deno.test("visibleUnits: hiding seconds on an all-zero clock leaves nothing", () => {
  assertEquals(visibleUnits(parts({}), { seconds: "hide" }), []);
});

Deno.test("service worker precaches only files that exist", async () => {
  const root = new URL("..", import.meta.url);
  const source = await Deno.readTextFile(new URL("sw.js", root));
  const list = source.match(/const ASSETS = \[([\s\S]*?)\]/)?.[1] ?? "";
  const assets = [...list.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assertEquals(assets.length > 0, true);
  for (const asset of assets) {
    const info = await Deno.stat(new URL(asset === "./" ? "index.html" : asset, root));
    assertEquals(info.isFile, true, asset);
  }
});
