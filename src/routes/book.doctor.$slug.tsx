import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { DemoPaymentDialog, type DemoPaymentResult } from "@/components/demo-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doctorQuery } from "@/lib/queries";
import { createAppointment, getActiveSubscription, listFamilyMembers, recordPayment } from "@/lib/data";
import { formatCurrency, toISODate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { Appointment } from "@/lib/types";

export const Route = createFileRoute("/book/doctor/$slug")({
  loader: async ({ context, params }) => {
    const doctor = await context.queryClient.ensureQueryData(doctorQuery(params.slug));
    if (!doctor) throw notFound();
    return doctor;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Book an appointment with ${loaderData?.name ?? "a doctor"} | cityhealth` },
      { name: "description", content: `Choose a date and time to consult ${loaderData?.name ?? "our specialists"} and confirm your appointment online.` },
      { property: "og:title", content: `Book ${loaderData?.name ?? "a doctor"} | cityhealth` },
      { property: "og:description", content: "Pick a slot and confirm your consultation in a few steps." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: BookDoctorPage,
  notFoundComponent: () => <p className="p-16 text-center text-muted-foreground">This doctor profile is unavailable.</p>,
  errorComponent: () => <p className="p-16 text-center text-muted-foreground">The booking page could not be loaded.</p>,
});

function BookDoctorPage() {
  return (
    <AuthGate title="Sign in to book an appointment">
      <BookingForm />
    </AuthGate>
  );
}

function BookingForm() {
  const { slug } = Route.useParams();
  const { data: doctor } = useSuspenseQuery(doctorQuery(slug));
  const { user } = useAuth();

  const { data: family = [] } = useQuery({ queryKey: ["family", user?.id], queryFn: () => listFamilyMembers(user!.id), enabled: Boolean(user) });
  const { data: subscription } = useQuery({ queryKey: ["subscription", user?.id], queryFn: () => getActiveSubscription(user!.id), enabled: Boolean(user) });

  const [date, setDate] = useState(toISODate(new Date()));
  const [slot, setSlot] = useState<string>("");
  const [type, setType] = useState("In-person");
  const [bookingFor, setBookingFor] = useState("self");
  const [name, setName] = useState(user?.user_metadata?.["full_name"] ?? "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);

  if (!doctor) return null;

  const fee = doctor.fee;
  const discountPercent = subscription?.plan?.discount_percent ?? 0;
  const discount = Math.round((fee * discountPercent) / 100);
  const total = fee - discount;

  const startPayment = () => {
    if (!slot) return toast.error("Please choose an appointment slot.");
    if (!name.trim() || !phone.trim()) return toast.error("Please add the patient name and phone number.");
    if (!/^[0-9+\-\s]{8,15}$/.test(phone.trim())) return toast.error("Please enter a valid phone number.");
    setPayOpen(true);
  };

  const complete = async (result: DemoPaymentResult) => {
    if (!user) return;
    setPayOpen(false);
    try {
      if (result.status === "failed") {
        await recordPayment({ user_id: user.id, payment_type: "appointment", amount: total, payment_method: result.method, transaction_id: result.transactionId, payment_status: "failed" });
        toast.error("Demo payment failed. No appointment was created and nothing was charged.");
        return;
      }
      const member = family.find((f) => f.id === bookingFor);
      const appointment = await createAppointment({
        user_id: user.id,
        doctor_id: doctor.id,
        hospital_id: doctor.hospital_id,
        appointment_date: date,
        appointment_time: slot,
        consultation_type: type,
        booking_for: bookingFor === "self" ? "self" : "family",
        family_member_id: member?.id ?? null,
        patient_name: name.trim(),
        patient_dob: member?.date_of_birth ?? null,
        patient_gender: member?.gender ?? null,
        patient_phone: phone.trim(),
        patient_email: user.email ?? null,
        notes: notes.trim() || null,
        fee,
        discount,
        total,
        status: "confirmed",
      });
      await recordPayment({ user_id: user.id, booking_id: appointment.id, payment_type: "appointment", amount: total, payment_method: result.method, transaction_id: result.transactionId, payment_status: "successful" });
      setBooked(appointment);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  if (booked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Appointment confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">Booking reference <span className="font-semibold text-foreground">{booked.booking_ref}</span></p>
        <div className="mt-6 rounded-lg border bg-card p-5 text-left text-sm shadow-card">
          <p><span className="text-muted-foreground">Doctor:</span> {doctor.name}</p>
          <p className="mt-1"><span className="text-muted-foreground">When:</span> {booked.appointment_date} at {booked.appointment_time}</p>
          <p className="mt-1"><span className="text-muted-foreground">Mode:</span> {booked.consultation_type}</p>
          <p className="mt-1"><span className="text-muted-foreground">Paid (demo):</span> {formatCurrency(booked.total)}</p>
        </div>
        <Button asChild className="mt-6"><Link to="/dashboard">Go to my appointments</Link></Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 pb-16">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="rounded-lg border bg-card p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold text-navy">Book an appointment</h1>
          <p className="mt-1 text-sm text-muted-foreground">{doctor.name} · {doctor.specialty?.name} · {doctor.hospital?.name}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" min={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Consultation type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(doctor.consultation_types?.length ? doctor.consultation_types : ["In-person"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5">
            <Label>Available slots</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {doctor.slots?.map((s) => (
                <button key={s} type="button" onClick={() => setSlot(s)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${slot === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Booking for</Label>
              <Select value={bookingFor} onValueChange={(v) => {
                setBookingFor(v);
                const m = family.find((f) => f.id === v);
                if (m) setName(m.full_name);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Myself</SelectItem>
                  {family.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name} ({f.relation})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pname">Patient name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pphone">Phone number</Label>
              <Input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">Reason for visit (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Briefly describe your symptoms" />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-navy">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Consultation fee</dt><dd>{formatCurrency(fee)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Membership discount</dt><dd>-{formatCurrency(discount)}</dd></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
          <Button className="mt-5 w-full" onClick={startPayment}><CalendarCheck className="size-4" />Confirm and pay (demo)</Button>
          <p className="mt-3 text-xs text-muted-foreground">Payments here are simulated for demonstration. No real money is charged and no real payment details are collected.</p>
        </aside>
      </div>

      <DemoPaymentDialog open={payOpen} onOpenChange={setPayOpen} amount={total} onComplete={complete} />
    </div>
  );
}
