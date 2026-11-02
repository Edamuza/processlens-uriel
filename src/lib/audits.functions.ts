import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeKpis, DEFAULT_COMPLEXITY_COSTS, snapShare, type Analysis, type ComplexityCosts, type Step } from "./roi";
import { SEED_AUDITS, seedRow } from "./seed";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const intakeSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(100),
  team_size: z.number().int().min(1).max(100000),
  hourly_cost: z.number().min(1).max(100000),
  workflow_name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(20).max(5000),
  runs_per_week: z.number().min(0.1).max(10000),
  roles: z.string().trim().min(1).max(500),
  tools: z.string().trim().max(500),
  pain_points: z.string().trim().max(2000),
});

const stepSchema = z.object({
  name: z.string().max(300),
  owner: z.string().max(200),
  minutes: z.number().min(0).max(100000),
  manual: z.boolean(),
  automatable_share: z.number().min(0).max(1),
  idea: z.string().max(1000),
  tool_category: z.string().max(200),
  complexity: z.enum(["low", "medium", "high"]),
});

const costsSchema = z.object({ low: z.number().min(0), medium: z.number().min(0), high: z.number().min(0) });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function friendlyAiError(e: unknown): string {
  const status = (e as { statusCode?: number })?.statusCode ?? (e as { cause?: { statusCode?: number } })?.cause?.statusCode;
  if (status === 429) return "The AI is rate limited right now. Please wait a minute and try again.";
  if (status === 402) return "AI credits are exhausted for this workspace. Please try again later.";
  if (status === 403) return "The AI request was denied for this workspace.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/timeout|aborted/i.test(msg)) return "The analysis timed out. Please try again.";
  return "The AI analysis failed. Please try again.";
}

async function runAnalysis(input: z.infer<typeof intakeSchema>): Promise<Analysis> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText, Output } = await import("ai");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const phase = z.object({ goal: z.string(), tasks: z.array(z.string()) });
  const schema = z.object({
    steps: z.array(
      z.object({
        name: z.string(),
        owner: z.string(),
        minutes: z.number(),
        manual: z.boolean(),
        automatable_share: z.number(),
        idea: z.string(),
        tool_category: z.string(),
        complexity: z.enum(["low", "medium", "high"]),
      }),
    ),
    risks: z.array(z.string()),
    plan: z.object({ d30: phase, d60: phase, d90: phase }),
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "You are an AI solutions engineer auditing a small business workflow in the Philippines. Map the workflow into 4-10 ordered steps. For each: short step name, role/owner, realistic minutes per single run, whether it's manual, automatable_share (exactly one of 0, 0.25, 0.5, 0.75, 1), a one-sentence automation idea, a tool category (e.g. 'LLM extraction', 'workflow automation', 'form + database', 'e-signature', 'document generation'), and implementation complexity (low/medium/high). Also return 3-5 risks/assumptions and a 30/60/90-day plan where each phase has a goal and 2-4 tasks. NEVER compute money, costs, or savings.",
    prompt: `Business: ${input.business_name} (${input.industry}, ${input.team_size} staff)\nWorkflow: ${input.workflow_name}\nHow it's done today: ${input.description}\nRuns per week: ${input.runs_per_week}\nPeople involved: ${input.roles}\nTools today: ${input.tools || "n/a"}\nPain points: ${input.pain_points || "n/a"}`,
    experimental_output: Output.object({ schema }),
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let raw: z.infer<typeof schema>;
  try {
    raw = (await result.experimental_output) as z.infer<typeof schema>;
  } catch (e) {
    throw e;
  }
  const steps: Step[] = raw.steps.slice(0, 10).map((s) => ({
    ...s,
    minutes: Math.max(0, Math.round(Number(s.minutes) || 0)),
    automatable_share: snapShare(Number(s.automatable_share) || 0),
  }));
  if (steps.length < 4) throw new Error("The AI returned too few steps. Please try again.");
  const clip = (p: { goal: string; tasks: string[] }) => ({ goal: p.goal, tasks: p.tasks.slice(0, 4) });
  return {
    steps,
    risks: raw.risks.slice(0, 5),
    plan: { d30: clip(raw.plan.d30), d60: clip(raw.plan.d60), d90: clip(raw.plan.d90) },
  };
}

function stored(steps: Step[], runs: number, hourly: number, costs: ComplexityCosts) {
  const k = computeKpis(steps, runs, hourly, costs);
  return {
    monthly_hours: k.monthlyHours,
    monthly_cost: k.monthlyCost,
    hours_saved: k.hoursSaved,
    monthly_savings: k.monthlySavings,
  };
}

export const createAndAnalyzeAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => intakeSchema.parse(d))
  .handler(async ({ data }): Promise<Result<{ id: string }>> => {
    let analysis: Analysis;
    try {
      analysis = await runAnalysis(data);
    } catch (e) {
      console.error(e);
      return { ok: false, error: friendlyAiError(e) };
    }
    const db = await admin();
    const { data: row, error } = await db
      .from("audits")
      .insert({
        ...data,
        analysis: analysis as never,
        complexity_costs: DEFAULT_COMPLEXITY_COSTS as never,
        status: "analyzed",
        ...stored(analysis.steps, data.runs_per_week, data.hourly_cost, DEFAULT_COMPLEXITY_COSTS),
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false, error: "Could not save the audit." };
    return { ok: true, data: { id: row.id } };
  });

export const rerunAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const { data: a } = await db.from("audits").select("*").eq("id", data.id).single();
    if (!a) return { ok: false, error: "Audit not found." };
    let analysis: Analysis;
    try {
      analysis = await runAnalysis({
        business_name: a.business_name,
        industry: a.industry,
        team_size: a.team_size,
        hourly_cost: Number(a.hourly_cost),
        workflow_name: a.workflow_name,
        description: a.description,
        runs_per_week: Number(a.runs_per_week),
        roles: a.roles,
        tools: a.tools,
        pain_points: a.pain_points,
      });
    } catch (e) {
      console.error(e);
      return { ok: false, error: friendlyAiError(e) };
    }
    const costs = (a.complexity_costs as unknown as ComplexityCosts) ?? DEFAULT_COMPLEXITY_COSTS;
    const { error } = await db
      .from("audits")
      .update({
        analysis: analysis as never,
        status: "analyzed",
        updated_at: new Date().toISOString(),
        ...stored(analysis.steps, Number(a.runs_per_week), Number(a.hourly_cost), costs),
      })
      .eq("id", data.id);
    if (error) return { ok: false, error: "Could not save the new analysis." };
    return { ok: true, data: null };
  });

export const saveReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        hourly_cost: z.number().min(1).max(100000),
        complexity_costs: costsSchema,
        steps: z.array(stepSchema).min(1).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const { data: a } = await db.from("audits").select("runs_per_week, analysis").eq("id", data.id).single();
    if (!a || !a.analysis) return { ok: false, error: "Audit not found." };
    const steps = data.steps.map((s) => ({ ...s, automatable_share: snapShare(s.automatable_share) }));
    const analysis = { ...(a.analysis as unknown as Analysis), steps };
    const { error } = await db
      .from("audits")
      .update({
        hourly_cost: data.hourly_cost,
        complexity_costs: data.complexity_costs as never,
        analysis: analysis as never,
        updated_at: new Date().toISOString(),
        ...stored(steps, Number(a.runs_per_week), data.hourly_cost, data.complexity_costs),
      })
      .eq("id", data.id);
    if (error) return { ok: false, error: "Could not save changes." };
    return { ok: true, data: null };
  });

export const resetDemoData = createServerFn({ method: "POST" }).handler(async (): Promise<Result<null>> => {
  const db = await admin();
  const { error: delErr } = await db.from("audits").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) return { ok: false, error: "Could not reset demo data." };
  const { error } = await db.from("audits").insert(SEED_AUDITS.map((s) => seedRow(s)) as never);
  if (error) return { ok: false, error: "Could not restore seed data." };
  return { ok: true, data: null };
});
