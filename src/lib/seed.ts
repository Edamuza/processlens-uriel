import { computeKpis, DEFAULT_COMPLEXITY_COSTS, type Analysis } from "./roi";

export interface SeedAudit {
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
  analysis: Analysis;
  created_at: string;
}

export const SEED_AUDITS: SeedAudit[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    business_name: "Ngiti Dental Clinic (fictional)",
    industry: "Healthcare",
    team_size: 12,
    hourly_cost: 220,
    workflow_name: "Patient billing and HMO claims",
    description:
      "After each visit the receptionist encodes procedures from paper charts into a spreadsheet, prepares HMO claim forms by hand, follows up claims by phone, and reconciles payments weekly.",
    runs_per_week: 60,
    roles: "Receptionist, Dentist, Billing clerk",
    tools: "Paper charts, Excel, phone, HMO portals",
    pain_points: "Encoding errors, rejected claims, slow HMO follow-ups, weekly reconciliation takes a full afternoon.",
    created_at: "2026-10-20T09:00:00Z",
    analysis: {
      steps: [
        { name: "Encode procedures from paper chart", owner: "Receptionist", minutes: 6, manual: true, automatable_share: 0.75, idea: "Use a tablet charting form so procedures are captured once at chairside.", tool_category: "form + database", complexity: "medium" },
        { name: "Look up HMO coverage and codes", owner: "Receptionist", minutes: 4, manual: true, automatable_share: 0.5, idea: "Auto-suggest HMO procedure codes from a maintained coverage table.", tool_category: "form + database", complexity: "low" },
        { name: "Fill HMO claim form", owner: "Billing clerk", minutes: 8, manual: true, automatable_share: 0.75, idea: "Generate pre-filled claim PDFs from the visit record.", tool_category: "document generation", complexity: "medium" },
        { name: "Dentist signs claim", owner: "Dentist", minutes: 1, manual: true, automatable_share: 0.5, idea: "Batch e-signature of daily claims in one click.", tool_category: "e-signature", complexity: "low" },
        { name: "Follow up claim status by phone", owner: "Billing clerk", minutes: 5, manual: true, automatable_share: 0.5, idea: "Track claim status in a dashboard with automated reminder emails to HMOs.", tool_category: "workflow automation", complexity: "medium" },
        { name: "Reconcile payments to claims", owner: "Billing clerk", minutes: 3, manual: true, automatable_share: 0.75, idea: "Use LLM extraction on HMO remittance statements to auto-match payments.", tool_category: "LLM extraction", complexity: "high" },
      ],
      risks: [
        "Assumes HMOs accept system-generated claim forms without format changes.",
        "Staff need 1–2 weeks of training to stop using paper charts.",
        "Patient data must comply with the Data Privacy Act of 2012.",
        "Remittance statement formats vary by HMO; extraction accuracy must be reviewed.",
      ],
      plan: {
        d30: { goal: "Digitize visit capture", tasks: ["Build chairside procedure form", "Load HMO code table", "Train receptionists"] },
        d60: { goal: "Automate claim preparation", tasks: ["Generate pre-filled claim PDFs", "Add batch e-signature", "Launch claim status dashboard"] },
        d90: { goal: "Close the payment loop", tasks: ["Extract remittance data with LLM", "Auto-match payments to claims", "Review accuracy and exceptions weekly"] },
      },
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    business_name: "BiyaheXpress Logistics (fictional)",
    industry: "Logistics",
    team_size: 30,
    hourly_cost: 260,
    workflow_name: "Daily dispatch and proof of delivery",
    description:
      "The dispatcher receives orders by Viber and email, assigns drivers on a whiteboard, drivers send photos of signed receipts, and an admin encodes PODs and sends an end-of-day status to clients.",
    runs_per_week: 40,
    roles: "Dispatcher, Driver, Admin",
    tools: "Viber, Gmail, whiteboard, Google Sheets",
    pain_points: "Lost orders in chat, unclear driver assignments, late POD encoding, clients calling for status.",
    created_at: "2026-10-27T09:00:00Z",
    analysis: {
      steps: [
        { name: "Collect orders from Viber and email", owner: "Dispatcher", minutes: 10, manual: true, automatable_share: 0.75, idea: "Extract order details from chats and emails into a structured order queue.", tool_category: "LLM extraction", complexity: "medium" },
        { name: "Assign drivers on whiteboard", owner: "Dispatcher", minutes: 8, manual: true, automatable_share: 0.5, idea: "Digital dispatch board that suggests drivers by area and load.", tool_category: "form + database", complexity: "medium" },
        { name: "Notify drivers of assignments", owner: "Dispatcher", minutes: 4, manual: true, automatable_share: 1, idea: "Auto-send assignments to drivers via SMS/Viber.", tool_category: "workflow automation", complexity: "low" },
        { name: "Drivers send POD photos", owner: "Driver", minutes: 3, manual: true, automatable_share: 0.25, idea: "Mobile upload form that tags photos to the delivery.", tool_category: "form + database", complexity: "low" },
        { name: "Encode POD details", owner: "Admin", minutes: 7, manual: true, automatable_share: 0.75, idea: "Read receipt photos with LLM extraction to fill POD fields.", tool_category: "LLM extraction", complexity: "high" },
        { name: "Send end-of-day status to clients", owner: "Admin", minutes: 6, manual: true, automatable_share: 1, idea: "Auto-generate and email daily status reports per client.", tool_category: "workflow automation", complexity: "low" },
      ],
      risks: [
        "Drivers need reliable mobile data to upload PODs in the field.",
        "Handwritten receipts may reduce extraction accuracy; keep human review.",
        "Clients may want to keep receiving Viber updates instead of email.",
        "Assumes order volume stays near 40 dispatch runs per week.",
      ],
      plan: {
        d30: { goal: "Single order queue", tasks: ["Connect Viber and email intake", "Extract orders into a queue", "Pilot with two dispatchers"] },
        d60: { goal: "Digital dispatch", tasks: ["Launch dispatch board", "Auto-notify drivers", "Roll out POD upload form"] },
        d90: { goal: "Automated client reporting", tasks: ["Extract POD data from photos", "Auto-send daily client status", "Measure time saved vs baseline"] },
      },
    },
  },
];

export function seedRow(s: SeedAudit) {
  const k = computeKpis(s.analysis.steps, s.runs_per_week, s.hourly_cost, DEFAULT_COMPLEXITY_COSTS);
  return {
    ...s,
    status: "analyzed",
    is_seed: true,
    complexity_costs: DEFAULT_COMPLEXITY_COSTS,
    monthly_hours: k.monthlyHours,
    monthly_cost: k.monthlyCost,
    hours_saved: k.hoursSaved,
    monthly_savings: k.monthlySavings,
  };
}
