import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAndAnalyzeAudit } from "@/lib/audits.functions";

export const Route = createFileRoute("/audits/new")({
  head: () => ({
    meta: [
      { title: "New audit — ProcessLens" },
      { name: "description", content: "Three-step guided intake to map a manual workflow and analyze it with AI." },
      { property: "og:title", content: "New audit — ProcessLens" },
      { property: "og:description", content: "Describe a manual workflow and get an AI automation ROI analysis." },
    ],
  }),
  component: NewAudit,
});

const INDUSTRIES = ["Healthcare", "Logistics", "Food & beverage", "Retail", "Professional services", "Manufacturing", "Real estate", "Education", "Other"];

type Form = {
  business_name: string; industry: string; team_size: string; hourly_cost: string;
  workflow_name: string; description: string; runs_per_week: string; roles: string; tools: string; pain_points: string;
};

const EMPTY: Form = {
  business_name: "", industry: "", team_size: "", hourly_cost: "250",
  workflow_name: "", description: "", runs_per_week: "", roles: "", tools: "", pain_points: "",
};

export function validateStep(step: number, f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (step === 0) {
    if (!f.business_name.trim()) e.business_name = "Business name is required.";
    if (!f.industry) e.industry = "Pick an industry.";
    if (!(Number(f.team_size) >= 1) || !Number.isInteger(Number(f.team_size))) e.team_size = "Enter a whole number of staff (1+).";
    if (!(Number(f.hourly_cost) > 0)) e.hourly_cost = "Enter an hourly cost above 0.";
  }
  if (step === 1) {
    if (!f.workflow_name.trim()) e.workflow_name = "Workflow name is required.";
    if (f.description.trim().length < 20) e.description = "Describe the workflow in at least 20 characters.";
    if (!(Number(f.runs_per_week) > 0)) e.runs_per_week = "How many times per week? Must be above 0.";
    if (!f.roles.trim()) e.roles = "List at least one role.";
  }
  return e;
}

const STEPS = ["Business", "Workflow", "Review & analyze"];

function NewAudit() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const next = () => {
    const e = validateStep(step, f);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  };

  async function analyze() {
    setBusy(true);
    try {
      const r = await createAndAnalyzeAudit({
        data: {
          business_name: f.business_name, industry: f.industry, team_size: Number(f.team_size),
          hourly_cost: Number(f.hourly_cost), workflow_name: f.workflow_name, description: f.description,
          runs_per_week: Number(f.runs_per_week), roles: f.roles, tools: f.tools, pain_points: f.pain_points,
        },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["audits"] });
      toast.success("Analysis complete.");
      navigate({ to: "/report/$id", params: { id: r.data.id } });
    } catch {
      toast.error("Something went wrong reaching the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">New audit</h1>
      <ol className="mt-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 flex-1">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border bg-card p-5 sm:p-6 shadow-card space-y-4">
        {step === 0 && (
          <>
            <Field label="Business name" error={errors.business_name}>
              <Input value={f.business_name} onChange={(e) => set("business_name")(e.target.value)} placeholder="e.g. Kusina ni Lola Restaurant" />
            </Field>
            <Field label="Industry" error={errors.industry}>
              <Select value={f.industry} onValueChange={set("industry")}>
                <SelectTrigger aria-label="Industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Team size" error={errors.team_size}>
                <Input type="number" min={1} value={f.team_size} onChange={(e) => set("team_size")(e.target.value)} placeholder="25" />
              </Field>
              <Field label="Avg loaded hourly cost per staff (PHP)" error={errors.hourly_cost}>
                <Input type="number" min={1} value={f.hourly_cost} onChange={(e) => set("hourly_cost")(e.target.value)} />
              </Field>
            </div>
            <Field label="Currency">
              <Input value="PHP — Philippine peso" disabled />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Workflow name" error={errors.workflow_name}>
              <Input value={f.workflow_name} onChange={(e) => set("workflow_name")(e.target.value)} placeholder="e.g. Weekly payroll for a 25-person restaurant" />
            </Field>
            <Field label="How is it done today?" error={errors.description}>
              <Textarea rows={6} value={f.description} onChange={(e) => set("description")(e.target.value)}
                placeholder="e.g. Every Friday the manager collects paper timecards, types hours into Excel, computes overtime and deductions by hand, prints payslips, and transfers pay one by one through the bank app." />
            </Field>
            <Field label="Runs per week" error={errors.runs_per_week}>
              <Input type="number" min={0} step="any" value={f.runs_per_week} onChange={(e) => set("runs_per_week")(e.target.value)} placeholder="1" />
            </Field>
            <Field label="People involved (roles, comma-separated)" error={errors.roles}>
              <Input value={f.roles} onChange={(e) => set("roles")(e.target.value)} placeholder="Manager, Cashier, Owner" />
            </Field>
            <Field label="Tools used today">
              <Input value={f.tools} onChange={(e) => set("tools")(e.target.value)} placeholder="Paper timecards, Excel, bank app" />
            </Field>
            <Field label="Biggest pain points">
              <Textarea rows={3} value={f.pain_points} onChange={(e) => set("pain_points")(e.target.value)} placeholder="Computation errors, takes the whole Friday afternoon…" />
            </Field>
          </>
        )}
        {step === 2 && (
          <dl className="grid gap-3 text-sm">
            {([
              ["Business", `${f.business_name} · ${f.industry} · ${f.team_size} staff`],
              ["Hourly cost", `₱${f.hourly_cost} / hour`],
              ["Workflow", f.workflow_name],
              ["Today", f.description],
              ["Runs per week", f.runs_per_week],
              ["People", f.roles],
              ["Tools", f.tools || "—"],
              ["Pain points", f.pain_points || "—"],
            ] as const).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 border-b pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="outline" disabled={step === 0 || busy} onClick={() => { setErrors({}); setStep((s) => s - 1); }}>Back</Button>
        {step < 2 ? (
          <Button onClick={next}>Next</Button>
        ) : (
          <Button onClick={analyze} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing… (~30s)</> : <><Sparkles className="h-4 w-4" /> Analyze workflow</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
