import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis, ComplexityCosts } from "./roi";

export interface AuditRow {
  id: string;
  business_name: string;
  industry: string;
  team_size: number;
  hourly_cost: number;
  workflow_name: string;
  description: string;
  runs_per_week: number;
  roles: string;
  tools: string;
  pain_points: string;
  analysis: Analysis | null;
  complexity_costs: ComplexityCosts;
  status: string;
  is_seed: boolean;
  monthly_hours: number;
  monthly_cost: number;
  hours_saved: number;
  monthly_savings: number;
  created_at: string;
}

const norm = (r: Record<string, unknown>): AuditRow =>
  ({
    ...r,
    hourly_cost: Number(r.hourly_cost),
    runs_per_week: Number(r.runs_per_week),
    monthly_hours: Number(r.monthly_hours),
    monthly_cost: Number(r.monthly_cost),
    hours_saved: Number(r.hours_saved),
    monthly_savings: Number(r.monthly_savings),
  }) as unknown as AuditRow;

export const auditsQuery = () =>
  queryOptions({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => norm(r as Record<string, unknown>));
    },
  });

export const auditQuery = (id: string) =>
  queryOptions({
    queryKey: ["audit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? norm(data as Record<string, unknown>) : null;
    },
  });
