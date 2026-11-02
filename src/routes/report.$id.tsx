import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, Loader2, Printer, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auditQuery } from "@/lib/queries";
import { computeKpis, num, php, SHARES, type ComplexityCosts, type Step } from "@/lib/roi";
import { rerunAnalysis, saveReport } from "@/lib/audits.functions";

export const Route = createFileRoute("/report/$id")({
  loader: async ({ context, params }) => {
    const a = await context.queryClient.ensureQueryData(auditQuery(params.id));
    if (!a) throw notFound();
    return { title: `${a.workflow_name} — ${a.business_name}` };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.title} · ROI report` : "ROI report — ProcessLens";
    return {
      meta: [
        { title: t },
        { name: "description", content: "Workflow automation ROI report: hours, peso cost, savings, payback and a 30/60/90 plan." },
        { property: "og:title", content: t },
        { property: "og:description", content: "Automation ROI report generated with ProcessLens." },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="text-center py-20">
      <h1 className="text-2xl font-semibold">Report not found</h1>
      <p className="text-muted-foreground mt-2">It may have been removed by a demo reset.</p>
      <Link to="/" className="text-primary underline mt-4 inline-block">Back to audits</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20">
      <h1 className="text-2xl font-semibold">This report didn't load</h1>
      <p className="text-muted-foreground mt-2">{error instanceof Error ? error.message : "Something went wrong."}</p>
      <Link to="/" className="text-primary underline mt-4 inline-block">Back to audits</Link>
    </div>
  ),
  component: Report,
});

function Report() {
  const { id } = Route.useParams();
  const { data: a } = useSuspenseQuery(auditQuery(id));
  const qc = useQueryClient();
  const [steps, setSteps] = useState<Step[]>(a?.analysis?.steps ?? []);
  const [hourly, setHourly] = useState(a?.hourly_cost ?? 250);
  const [costs, setCosts] = useState<ComplexityCosts>(a!.complexity_costs);
  const [saving, setSaving] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  useEffect(() => {
    if (!a) return;
    setSteps(a.analysis?.steps ?? []);
    setHourly(a.hourly_cost);
    setCosts(a.complexity_costs);
  }, [a]);

  const k = useMemo(() => computeKpis(steps, a?.runs_per_week ?? 0, hourly, costs), [steps, a, hourly, costs]);
  const dirty =
    !!a &&
    (JSON.stringify(steps) !== JSON.stringify(a.analysis?.steps) ||
      hourly !== a.hourly_cost ||
      JSON.stringify(costs) !== JSON.stringify(a.complexity_costs));

  if (!a || !a.analysis) return <p className="text-muted-foreground">This audit has no analysis yet.</p>;
  const { plan, risks } = a.analysis;

  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setSaving(true);
    try {
      if (!(hourly > 0)) {
        toast.error("Hourly cost must be greater than 0 to save.");
        return;
      }
      const r = await saveReport({ data: { id, hourly_cost: hourly, complexity_costs: costs, steps } });
      if (!r.ok) throw new Error(r.error);
      await qc.invalidateQueries();
      toast.success("Changes saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function rerun() {
    setRerunning(true);
    try {
      const r = await rerunAnalysis({ data: { id } });
      if (!r.ok) throw new Error(r.error);
      await qc.invalidateQueries();
      toast.success("Analysis re-run complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-run failed.");
    } finally {
      setRerunning(false);
    }
  }

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.");
      return;
    } catch {
      // fall through to legacy copy
    }
    let ok = false;
    const ta = document.createElement("textarea");
    try {
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, url.length);
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    } finally {
      ta.remove();
    }
    if (ok) toast.success("Share link copied.");
    else toast.error("Couldn't copy. The link is: " + url);
  }

  const chart = steps.map((s, i) => ({
    name: `${i + 1}. ${s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name}`,
    Automatable: +(s.minutes * s.automatable_share).toFixed(2),
    "Stays manual": +(s.minutes * (1 - s.automatable_share)).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <header className="report-header rounded-xl bg-hero text-primary-foreground p-6 sm:p-8 print-break">
        <div className="text-xs uppercase tracking-widest text-primary-foreground/70">ROI report · {a.industry} · {a.team_size} staff</div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold">{a.workflow_name}</h1>
        <p className="mt-1 text-primary-foreground/85">{a.business_name}</p>
        <p className="mt-3 text-sm text-primary-foreground/75 max-w-3xl">{a.description}</p>
        <p className="mt-2 text-xs text-primary-foreground/70">Runs {num(a.runs_per_week)}× per week · {k.minutesPerRun} min per run</p>
      </header>

      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /> Copy share link</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save as PDF</Button>
        <Button variant="outline" onClick={rerun} disabled={rerunning}>
          {rerunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {rerunning ? "Re-running…" : "Re-run analysis"}
        </Button>
        <Button onClick={save} disabled={!dirty || saving} className="sm:ml-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Current monthly hours" value={`${num(k.monthlyHours)} h`} />
        <Kpi label="Current monthly cost" value={php(k.monthlyCost)} />
        <Kpi label="Hours saved / month" value={`${num(k.hoursSaved)} h`} highlight />
        <Kpi label="Monthly savings" value={php(k.monthlySavings)} highlight />
        <Kpi label="Payback" value={k.paybackMonths === null ? "n/a" : `${k.paybackMonths.toFixed(1)} mo`} sub={`Impl. ${php(k.implementationCost)}`} />
      </section>

      <section className="rounded-xl border bg-card shadow-card overflow-hidden print-visible">
        <div className="p-4 border-b"><h2 className="text-lg font-semibold">Workflow steps</h2>
          <p className="text-xs text-muted-foreground">Edit minutes or automatable % — KPIs update instantly.</p></div>
        <div className="overflow-x-auto print-visible">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Step</th><th className="p-3">Owner</th><th className="p-3">Minutes</th>
                <th className="p-3">Automatable</th><th className="p-3 min-w-56">Automation idea</th><th className="p-3">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="p-3 font-medium min-w-40">{i + 1}. {s.name}</td>
                  <td className="p-3 text-muted-foreground">{s.owner}</td>
                  <td className="p-3">
                    <NumInput aria-label={`Minutes for ${s.name}`} className="w-20 h-8 tabular"
                      value={s.minutes} onChange={(v) => updateStep(i, { minutes: v })} />
                  </td>
                  <td className="p-3">
                    <select aria-label={`Automatable share for ${s.name}`} className="h-8 rounded-md border bg-background px-2 tabular"
                      value={s.automatable_share} onChange={(e) => updateStep(i, { automatable_share: Number(e.target.value) })}>
                      {SHARES.map((v) => <option key={v} value={v}>{v * 100}%</option>)}
                    </select>
                  </td>
                  <td className="p-3"><div>{s.idea}</div><div className="text-xs text-muted-foreground mt-1">{s.tool_category}</div></td>
                  <td className="p-3"><ComplexityBadge c={s.complexity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow-card p-4 print-break">
        <h2 className="text-lg font-semibold mb-3">Minutes per step</h2>
        <div className="h-72 print-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Automatable" stackId="a" fill="var(--automatable)" />
              <Bar dataKey="Stays manual" stackId="a" fill="var(--manual)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-card p-5 print-break">
          <h2 className="text-lg font-semibold">Risks & assumptions</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm">{risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </section>
        <section className="rounded-xl border bg-card shadow-card p-5 print-break">
          <h2 className="text-lg font-semibold">Assumptions</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <NumField label="Hourly cost (PHP)" value={hourly} onChange={setHourly} />
              {!(hourly > 0) && <p className="mt-1 text-xs text-destructive">Hourly cost must be greater than 0 to save.</p>}
            </div>
            <NumField label="Low complexity (PHP)" value={costs.low} onChange={(v) => setCosts((c) => ({ ...c, low: v }))} />
            <NumField label="Medium complexity (PHP)" value={costs.medium} onChange={(v) => setCosts((c) => ({ ...c, medium: v }))} />
            <NumField label="High complexity (PHP)" value={costs.high} onChange={(v) => setCosts((c) => ({ ...c, high: v }))} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Monthly hours = minutes/run × runs/week × 4.33 ÷ 60. Implementation cost sums the complexity cost of every step with automatable share above 0.</p>
        </section>
      </div>

      <section className="print-break">
        <h2 className="text-lg font-semibold mb-3">30 / 60 / 90-day plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {([["30 days", plan.d30], ["60 days", plan.d60], ["90 days", plan.d90]] as const).map(([label, p]) => (
            <div key={label} className="rounded-xl border bg-card shadow-card p-5">
              <div className="text-xs uppercase tracking-widest text-accent-foreground bg-accent inline-block rounded px-2 py-0.5">{label}</div>
              <div className="mt-2 font-display font-semibold">{p.goal}</div>
              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{p.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string | undefined; highlight?: boolean | undefined }) {
  return (
    <div className={`rounded-lg border p-4 shadow-card ${highlight ? "bg-secondary border-primary/30" : "bg-card"}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular ${highlight ? "text-primary" : ""}`} data-testid={`kpi-${label}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground tabular mt-0.5">{sub}</div>}
    </div>
  );
}

function ComplexityBadge({ c }: { c: Step["complexity"] }) {
  const cls = c === "low" ? "bg-secondary text-secondary-foreground" : c === "medium" ? "bg-accent text-accent-foreground" : "bg-destructive/15 text-destructive";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{c}</span>;
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <NumInput className="tabular h-9" value={value} onChange={onChange} />
    </label>
  );
}

/** Numeric input that keeps a local string while typing; empty counts as 0 live, clamps to >= 0 on blur. */
function NumInput({ value, onChange, className, "aria-label": ariaLabel }: {
  value: number; onChange: (v: number) => void; className?: string | undefined; "aria-label"?: string | undefined;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => ((Number(t) || 0) === value ? t : String(value)));
  }, [value]);
  return (
    <Input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={className}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      onBlur={() => {
        const n = Math.max(0, Number(text) || 0);
        setText(String(n));
        onChange(n);
      }}
    />
  );
}
