import { describe, expect, it } from "vitest";
import { computeKpis, DEFAULT_COMPLEXITY_COSTS, type Step } from "./roi";

const step = (minutes: number, share: number, complexity: Step["complexity"]): Step => ({
  name: "s", owner: "o", minutes, manual: true, automatable_share: share, idea: "", tool_category: "", complexity,
});

describe("computeKpis", () => {
  const steps = [step(10, 0.5, "low"), step(20, 0, "high"), step(30, 1, "medium")];
  const k = computeKpis(steps, 10, 250, DEFAULT_COMPLEXITY_COSTS);
  it("monthly hours = minutes × runs × 4.33 / 60", () => expect(k.monthlyHours).toBeCloseTo((60 * 10 * 4.33) / 60, 2));
  it("monthly cost = hours × hourly", () => expect(k.monthlyCost).toBeCloseTo(43.3 * 250, 1));
  it("hours saved uses automatable share", () => expect(k.hoursSaved).toBeCloseTo((35 * 10 * 4.33) / 60, 2));
  it("implementation cost sums only automatable steps", () => expect(k.implementationCost).toBe(55000));
  it("payback rounds to 1 decimal", () => expect(k.paybackMonths).toBe(Math.round((55000 / (k.monthlySavings)) * 10) / 10));
  it("payback is null when savings are 0", () =>
    expect(computeKpis([step(10, 0, "low")], 5, 250, DEFAULT_COMPLEXITY_COSTS).paybackMonths).toBeNull());
});
