import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { DemoPaymentDialog, type DemoPaymentResult } from "@/components/demo-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { packageQuery } from "@/lib/queries";
import { createPackageBooking, getActiveSubscription, recordPayment } from "@/lib/data";
import { formatCurrency, toISODate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { PackageBooking } from "@/lib/types";

const TIMES = ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM"];

export const Route = createFileRoute("/book/package/$slug")({
  loader: async ({ context, params }) => {
    const pkg = await context.queryClient.ensureQueryData(packageQuery(params.slug));
    if (!pkg) throw notFound();
    return pkg;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Book ${loaderData?.name ?? "a health package"} | cityhealth` },
      { name: "description", content: "Pick a date and time for your preventive health checkup and confirm your booking online." },
      { property: "og:title", content: `Book ${loaderData?.name ?? "a health package"} | cityhealth` },
      { property: "og:description", content: "Confirm your preventive health checkup booking online." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: () => <AuthGate title="Sign in to book a health package"><PackageBookingForm /></AuthGate>,
  notFoundComponent: () => <p className="p-16 text-center text-muted-foreground">This package is unavailable.</p>,
  errorComponent: () => <p className="p-16 text-center text-muted-foreground">The booking page could not be loaded.</p>,
});

function PackageBookingForm() {
  const { slug } = Route.useParams();
  const { data: pkg } = useSuspenseQuery(packageQuery(slug));
  const { user } = useAuth();
  const { data: subscription } = useQuery({ queryKey: ["subscription", user?.id], queryFn: () => getActiveSubscription(user!.id), enabled: Boolean(user) });

  const [date, setDate] = useState(toISODate(new Date()));
  const [time, setTime] = useState(TIMES[0] as string);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [booked, setBooked] = useState<PackageBooking | null>(null);

  if (!pkg) return null;

  const amount = pkg.discounted_price;
  const discount = Math.round((amount * (subscription?.plan?.discount_percent ?? 0)) / 100);
  const total = amount - discount;

  const start = () => {
    if (!name.trim() || !phone.trim()) return toast.error("Please add the patient name and phone number.");
    if (!/^[0-9+\-\s]{8,15}$/.test(phone.trim())) return toast.error("Please enter a valid phone number.");
    setPayOpen(true);
  };

  const complete = async (result: DemoPaymentResult) => {
    if (!user) return;
    setPayOpen(false);
    try {
      if (result.status === "failed") {
        await recordPayment({ user_id: user.id, payment_type: "package", amount: total, payment_method: result.method, transaction_id: result.transactionId, payment_status: "failed" });
        toast.error("Demo payment failed. No booking was created and nothing was charged.");
        return;
      }
      const booking = await createPackageBooking({
        user_id: user.id,
        package_id: pkg.id,
        hospital_id: pkg.hospital_id,
        booking_date: date,
        booking_time: time,
        patient_name: name.trim(),
        patient_phone: phone.trim(),
        patient_email: user.email ?? null,
        amount,
        discount,
        total,
        status: "confirmed",
      });
      await recordPayment({ user_id: user.id, booking_id: booking.id, payment_type: "package", amount: total, payment_method: result.method, transaction_id: result.transactionId, payment_status: "successful" });
      setBooked(booking);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  if (booked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Health checkup booked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reference <span className="font-semibold text-foreground">{booked.booking_ref}</span></p>
        <p className="mt-2 text-sm text-muted-foreground">{pkg.name} on {booked.booking_date} at {booked.booking_time}</p>
        <Button asChild className="mt-6"><Link to="/dashboard">Go to my bookings</Link></Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 pb-16">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="rounded-lg border bg-card p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold text-navy">Book health checkup</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pkg.name} · {pkg.hospital?.name ?? pkg.city}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pdate">Preferred date</Label>
              <Input id="pdate" type="date" min={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Preferred time</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kname">Patient name</Label>
              <Input id="kname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kphone">Phone number</Label>
              <Input id="kphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-navy">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Package price</dt><dd>{formatCurrency(amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Membership discount</dt><dd>-{formatCurrency(discount)}</dd></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
          <Button className="mt-5 w-full" onClick={start}>Confirm and pay (demo)</Button>
          <p className="mt-3 text-xs text-muted-foreground">Simulated payment only. No real money is charged.</p>
        </aside>
      </div>
      <DemoPaymentDialog open={payOpen} onOpenChange={setPayOpen} amount={total} onComplete={complete} />
    </div>
  );
}
