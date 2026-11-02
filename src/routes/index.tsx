import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { auditsQuery } from "@/lib/queries";
import { num, php } from "@/lib/roi";
import { resetDemoData } from "@/lib/audits.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Audits — ProcessLens" },
      { name: "description", content: "Portfolio of workflow audits with monthly hours found and peso savings from automation." },
      { property: "og:title", content: "Audits — ProcessLens" },
      { property: "og:description", content: "Workflow audits with hours found and PHP savings from AI automation." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auditsQuery()),
  component: Index,
});

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular text-foreground">{value}</div>
    </div>
  );
}

function Index() {
  const { data: audits } = useSuspenseQuery(auditsQuery());
  const qc = useQueryClient();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const totalHours = audits.reduce((s, a) => s + a.hours_saved, 0);
  const totalSavings = audits.reduce((s, a) => s + a.monthly_savings, 0);

  async function reset() {
    setResetting(true);
    try {
      const r = await resetDemoData();
      if (!r.ok) throw new Error(r.error);
      await qc.invalidateQueries();
      await router.invalidate();
      toast.success("Demo data restored.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-hero text-primary-foreground p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-semibold">Process audits</h1>
        <p className="mt-2 max-w-xl text-primary-foreground/80">
          Map a manual workflow, see what it costs in pesos, and find what AI can take off the team's plate.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/audits/new"><Plus className="h-4 w-4" /> New audit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" disabled={resetting}>
                <RotateCcw className="h-4 w-4" /> {resetting ? "Resetting…" : "Reset demo data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes every audit and restores the two fictional sample audits.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Audits" value={String(audits.length)} />
        <Kpi label="Monthly hours found" value={`${num(totalHours)} h`} />
        <Kpi label="Monthly savings" value={php(totalSavings)} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">All audits</h2>
        {audits.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            No audits yet. <Link to="/audits/new" className="text-primary underline">Start a new audit</Link> or reset the demo data.
          </div>
        ) : (
          <div className="grid gap-3">
            {audits.map((a) => (
              <Link
                key={a.id}
                to="/report/$id"
                params={{ id: a.id }}
                className="group rounded-lg border bg-card p-4 shadow-card hover:border-primary transition-colors grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{a.workflow_name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{a.business_name} · {a.industry}</div>
                </div>
                <Stat label="Monthly cost" value={php(a.monthly_cost)} />
                <Stat label="Est. savings / mo" value={php(a.monthly_savings)} accent />
                <Stat label="Date" value={new Date(a.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="sm:text-right sm:min-w-32">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`tabular text-sm ${accent ? "text-primary font-semibold" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
