import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About this project — ProcessLens" },
      { name: "description", content: "Problem, approach, architecture and next steps for ProcessLens, by Uriel Papa." },
      { property: "og:title", content: "About ProcessLens" },
      { property: "og:description", content: "How ProcessLens turns a discovery call into an AI automation ROI report." },
    ],
  }),
  component: About,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-card">
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-semibold">About this project</h1>
      <p className="text-muted-foreground">
        Built by <strong className="text-foreground">Uriel Papa</strong> ·{" "}
        <a className="text-primary underline" href="https://github.com/Edamuza" target="_blank" rel="noreferrer">GitHub</a> ·{" "}
        <a className="text-primary underline" href="https://linkedin.com/in/uriel-papa-vitese01" target="_blank" rel="noreferrer">LinkedIn</a>
      </p>
      <Section title="The problem">
        <p>Small businesses in the Philippines run core workflows — billing, dispatch, payroll — on paper, chat apps and spreadsheets. Owners feel the pain but can't put a peso figure on it, so automation projects never get prioritized or scoped. A single workflow often burns 100+ staff-hours a month.</p>
      </Section>
      <Section title="The approach">
        <p>During a discovery call, the engineer captures the workflow in a 3-step intake. An LLM maps it into 4–10 ordered steps with time estimates, automatable share, an automation idea, tool category and complexity, plus risks and a 30/60/90 plan — returned as <em>structured output against a strict JSON schema</em>.</p>
        <p>The model never touches money. All hours, costs, savings, implementation cost and payback are computed deterministically in code, and every assumption (minutes, automatable %, hourly cost, complexity costs) is editable live on the report.</p>
      </Section>
      <Section title="Architecture">
        <p className="font-mono text-xs bg-muted rounded p-3">Browser (TanStack Start + React) → server functions → Lovable AI Gateway (openai/gpt-6-astra, Responses API) → Lovable Cloud database</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Table:</strong> <code>audits</code> — intake fields, the AI analysis (JSON), complexity costs, and stored KPIs. Row-level security allows public read only; all writes go through server functions.</li>
          <li><strong>Server functions:</strong> <code>createAndAnalyzeAudit</code>, <code>rerunAnalysis</code>, <code>saveReport</code>, <code>resetDemoData</code>.</li>
          <li><strong>Shared ROI module:</strong> one function computes KPIs for the report, the stored values and the home page.</li>
        </ul>
      </Section>
      <Section title="What I'd do next in a real deployment">
        <ul className="list-disc pl-5 space-y-1">
          <li>Add consultant login and per-client workspaces; share links with expiry tokens.</li>
          <li>Calibrate minute estimates against time studies and keep a library of benchmarked steps per industry.</li>
          <li>Version analyses so edits and re-runs can be compared side by side.</li>
          <li>Export a branded PDF/Slides proposal and push the plan into a project tracker.</li>
          <li>Add evals on the analysis prompt (step coverage, share calibration) before changing models.</li>
        </ul>
      </Section>
    </div>
  );
}
