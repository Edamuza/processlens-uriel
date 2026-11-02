# Processlens Uriel

Build this complete app now, all screens and the backend, following the spec below. Use Lovable Cloud and Lovable AI; do not ask me for API keys.

# Project 2 — ProcessLens: process audit to ROI report

Build "ProcessLens", a tool an AI solutions engineer uses in a discovery call with a small business. The owner describes a manual workflow; the app maps it into steps, estimates time and peso cost, identifies what AI/automation can remove, and produces a shareable ROI report with an implementation plan.

## Screens
1. **Audits** (home): list of audits (business, workflow name, monthly cost, estimated monthly savings, date) with a "New audit" button. Show portfolio KPIs on top: number of audits, total monthly hours found, total monthly savings (PHP).
2. **New audit** — a 3-step guided intake (stepper, back/next, validation):
   - Step 1 Business: business name, industry (select), team size, average loaded hourly cost per staff in PHP (default 250), currency fixed to PHP.
   - Step 2 Workflow: workflow name, free-text description of how it's done today (textarea with an example placeholder), how many times it runs per week, people involved (roles, comma-separated), tools used today, biggest pain points.
   - Step 3 Review & analyze: summary of inputs, "Analyze workflow" button.
3. **Analysis** (AI, edge function, structured JSON output via tool calling/JSON schema): the model returns the workflow as 4–10 ordered steps, each with: step name, role/owner, estimated minutes per run, whether it is manual, automatable share (0, 0.25, 0.5, 0.75 or 1), the automation idea (one sentence), suggested tool category (e.g., "LLM extraction", "workflow automation", "form + database", "e-signature"), and implementation complexity (low/medium/high). It also returns 3–5 risks/assumptions and a 30/60/90-day implementation plan (each phase: goal + 2–4 tasks). The model must NOT compute money; the app computes all numbers deterministically in code:
   - minutes per run = sum of step minutes
   - monthly hours = minutes per run × runs per week × 4.33 / 60
   - monthly cost = monthly hours × hourly cost
   - monthly hours saved = Σ(step minutes × automatable share) × runs per week × 4.33 / 60
   - monthly savings = hours saved × hourly cost
   - implementation cost estimate = Σ over automatable steps of complexity cost (low 15,000; medium 40,000; high 90,000 PHP — editable on the report)
   - payback months = implementation cost ÷ monthly savings (1 decimal; "n/a" if savings is 0)
4. **Report** (/report/:id, shareable link, print-friendly via print CSS): header with business and workflow; KPI cards (current monthly hours, current monthly cost, hours saved, monthly savings, payback); a step table (step, owner, minutes, automatable %, idea, complexity) where each row's automatable % and minutes are editable and all KPIs recompute live and can be saved; a simple bar chart of minutes per step split into "automatable" vs "stays manual"; risks & assumptions; the 30/60/90 plan; an "Assumptions" box with editable hourly cost and complexity costs; buttons: "Copy share link", "Print / Save as PDF", "Re-run analysis".
5. **About this project** (common requirements).

## Seed data (fictional)
- "Ngiti Dental Clinic (fictional)", 12 staff, hourly cost 220 — workflow "Patient billing and HMO claims": receptionist encodes procedures from paper charts into a spreadsheet, prepares HMO claim forms by hand, follows up claims by phone, reconciles payments weekly; runs 60 times/week.
- "BiyaheXpress Logistics (fictional)", 30 staff, hourly cost 260 — workflow "Daily dispatch and proof of delivery": dispatcher receives orders by Viber/email, assigns drivers in a whiteboard, drivers send photos of signed receipts, admin encodes PODs and sends end-of-day status to clients; runs 40 times/week.
Both seeds must have complete stored analyses so their reports open instantly.

## Acceptance checks
- B1 Home shows the two seeded audits and correct portfolio KPIs (sum of their stored values).
- B2 Completing the 3-step intake for a new workflow (e.g., "Weekly payroll for a 25-person restaurant") produces an analysis with 4–10 steps, a 30/60/90 plan and risks, and opens its report.
- B3 KPI math on the report is consistent with the step table (spot-check: monthly hours = Σminutes × runs/week × 4.33 / 60).
- B4 Editing a step's automatable % or the hourly cost recomputes KPIs immediately; Save persists after reload.
- B5 The report URL opened in a new tab (fresh load) shows the same report.
- B6 Validation prevents moving past a step with required fields empty.
- B7 Reset demo data, About page, mobile layout, no console errors.


# Common requirements for all five portfolio apps (append to every Lovable spec)

These apps are portfolio pieces for Uriel Papa, who is applying for AI Solutions Engineer / Forward-Deployed Engineer roles. A hiring manager will open the published link and click around with no login and no setup. Everything must work on first visit.

## Stack and backend
- Use Lovable Cloud for the database, file storage and edge functions.
- Use Lovable AI (Lovable's built-in AI gateway) for every model call. Do not ask for, or depend on, any external API key (no OpenAI/Anthropic/OpenRouter keys).
- All model calls happen in edge functions, never in the browser.
- No login. This is a public demo. Keep Row Level Security enabled on every table, with policies that let the demo work (anonymous read of demo data; writes go through edge functions or narrowly scoped anon policies). The project must pass Lovable's security scan so it can be published.
- Handle AI errors visibly: show a friendly error toast/message on rate limits (429), credits (402) or timeouts, never a blank screen or a spinner that never ends.

## Demo data
- Seed realistic sample data on first load (or via a migration) so every screen has content immediately. All sample businesses, people and documents are fictional and labeled as such.
- Add a "Reset demo data" action (with confirm) that restores the seed state.
- Show a slim banner: "Demo app — all sample data is fictional."

## Portfolio framing
- Add an "About this project" page reachable from the nav with four short sections: The problem (who has it, what it costs), The approach (how the app solves it, the AI pattern used), Architecture (frontend → edge functions → Lovable AI → database; list tables and functions), What I'd do next in a real deployment. Author: Uriel Papa, with links to github.com/Edamuza and linkedin.com/in/uriel-papa-vitese01.
- Clean, professional, responsive UI (works at 375px phone width and on desktop). Consistent nav. Empty states, loading states and error states for every async action.

## Quality bar
- No console errors on load. No broken routes. Every button does something real.
- Numbers shown in tables/KPIs must be computed from stored data, not hard-coded.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://processlens-uriel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d3474cf-4983-45bb-8b84-cb9b929ea98b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
