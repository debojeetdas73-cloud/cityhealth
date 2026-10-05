import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoPaymentDialog } from "@/components/demo-payment";
import { plansQuery } from "@/lib/queries";
import { cancelSubscription, createSubscription, getActiveSubscription, recordPayment } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { SubscriptionPlan } from "@/lib/types";

export const Route = createFileRoute("/subscriptions")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "cityhealth Membership Plans | Save on Every Consultation" },
      { name: "description", content: "Choose a cityhealth membership for discounted consultations, priority appointments and family health benefits." },
      { property: "og:title", content: "cityhealth Membership Plans" },
      { property: "og:description", content: "Discounted consultations, priority appointments and family health benefits." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: SubscriptionsPage,
  errorComponent: () => <p className="p-12 text-center text-muted-foreground">Membership plans could not be loaded.</p>,
});

function SubscriptionsPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);

  const { data: active } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => getActiveSubscription(user!.id),
    enabled: Boolean(user),
  });

  const complete = async (result: { method: string; transactionId: string; status: "successful" | "failed" }) => {
    if (!user || !selected) return;
    try {
      if (result.status === "failed") {
        await recordPayment({ user_id: user.id, payment_type: "subscription", amount: selected.price, payment_method: result.method, transaction_id: result.transactionId, payment_status: "failed" });
        toast.error("Demo payment failed. Nothing was charged.");
      } else {
        await createSubscription(user.id, selected.id);
        await recordPayment({ user_id: user.id, payment_type: "subscription", amount: selected.price, payment_method: result.method, transaction_id: result.transactionId, payment_status: "successful" });
        toast.success(`${selected.name} membership activated.`);
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
    setSelected(null);
  };

  return (
    <div className="bg-muted/40 pb-16">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Badge variant="secondary" className="mx-auto"><Crown className="size-3.5" />Membership</Badge>
          <h1 className="mt-4 font-display text-3xl font-bold text-navy">Save on every visit with cityhealth membership</h1>
          <p className="mt-3 text-muted-foreground">Discounted consultations, priority slots and health package benefits for you and your family.</p>
        </div>
      </div>

      {active && (
        <div className="mx-auto mt-8 max-w-3xl rounded-lg border bg-card p-5 shadow-card">
          <p className="font-semibold text-navy">Active membership: {active.plan?.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Valid until {formatDate(active.expires_at)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={async () => {
            await cancelSubscription(active.id);
            toast.success("Membership cancelled.");
            await queryClient.invalidateQueries({ queryKey: ["subscription"] });
          }}>Cancel membership</Button>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {plans.map((plan) => (
          <div key={plan.id} className={`flex flex-col rounded-lg border bg-card p-6 shadow-card ${plan.featured ? "ring-2 ring-primary" : ""}`}>
            {plan.featured && <Badge className="mb-3 w-fit">Most popular</Badge>}
            <h2 className="font-display text-xl font-bold text-navy">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-4 font-display text-3xl font-bold text-navy">{formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span></p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
              {plan.benefits?.map((b) => <li key={b} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{b}</li>)}
            </ul>
            <Button className="mt-6" disabled={!user || active?.plan_id === plan.id} onClick={() => setSelected(plan)}>
              {active?.plan_id === plan.id ? "Current plan" : user ? "Choose plan" : "Sign in to subscribe"}
            </Button>
          </div>
        ))}
      </div>

      <DemoPaymentDialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)} amount={selected?.price ?? 0} onComplete={complete} />
    </div>
  );
}
