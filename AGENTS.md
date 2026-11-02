<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All ROI money/hour math lives in `src/lib/roi.ts` (`computeKpis`); the AI never computes money, and stored KPI columns on `audits` are always written from that function so home totals match reports.
- Reads use the browser client with an anon SELECT policy; all writes (create/analyze, save, reset) go through server functions in `src/lib/audits.functions.ts` using the admin client — no anon write policies.
- Seed data is defined once in `src/lib/seed.ts`; the reset action reinserts from it, so keep the migration seed in sync with it.
