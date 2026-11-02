export type Complexity = "low" | "medium" | "high";

export interface Step {
  name: string;
  owner: string;
  minutes: number;
  manual: boolean;
  automatable_share: number; // 0, 0.25, 0.5, 0.75, 1
  idea: string;
  tool_category: string;
  complexity: Complexity;
}

export interface PlanPhase {
  goal: string;
  tasks: string[];
}

export interface Analysis {
  steps: Step[];
  risks: string[];
  plan: { d30: PlanPhase; d60: PlanPhase; d90: PlanPhase };
}

export type ComplexityCosts = Record<Complexity, number>;

export const DEFAULT_COMPLEXITY_COSTS: ComplexityCosts = { low: 15000, medium: 40000, high: 90000 };
export const WEEKS_PER_MONTH = 4.33;
export const SHARES = [0, 0.25, 0.5, 0.75, 1] as const;

export interface Kpis {
  minutesPerRun: number;
  monthlyHours: number;
  monthlyCost: number;
  hoursSaved: number;
  monthlySavings: number;
  implementationCost: number;
  paybackMonths: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeKpis(
  steps: Step[],
  runsPerWeek: number,
  hourlyCost: number,
  costs: ComplexityCosts,
): Kpis {
  const minutesPerRun = steps.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
  const monthlyHours = (minutesPerRun * runsPerWeek * WEEKS_PER_MONTH) / 60;
  const monthlyCost = monthlyHours * hourlyCost;
  const savedMinutes = steps.reduce(
    (s, x) => s + (Number(x.minutes) || 0) * (Number(x.automatable_share) || 0),
    0,
  );
  const hoursSaved = (savedMinutes * runsPerWeek * WEEKS_PER_MONTH) / 60;
  const monthlySavings = hoursSaved * hourlyCost;
  const implementationCost = steps
    .filter((x) => x.automatable_share > 0)
    .reduce((s, x) => s + (costs[x.complexity] ?? 0), 0);
  const paybackMonths =
    monthlySavings > 0 ? Math.round((implementationCost / monthlySavings) * 10) / 10 : null;
  return {
    minutesPerRun,
    monthlyHours: r2(monthlyHours),
    monthlyCost: r2(monthlyCost),
    hoursSaved: r2(hoursSaved),
    monthlySavings: r2(monthlySavings),
    implementationCost,
    paybackMonths,
  };
}

export function snapShare(v: number): number {
  return SHARES.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), 0);
}

export const php = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
export const num = (n: number, d = 1) =>
  new Intl.NumberFormat("en-PH", { maximumFractionDigits: d }).format(n);
