import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Award, Building2, Calendar, GraduationCap, Languages, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { doctorQuery } from "@/lib/queries";

export const Route = createFileRoute("/doctors/$slug")({
  loader: async ({ context, params }) => {
    const doctor = await context.queryClient.ensureQueryData(doctorQuery(params.slug));
    if (!doctor) throw notFound();
    return { name: doctor.name, specialty: doctor.specialty?.name ?? "Specialist", city: doctor.city };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Doctor not found | cityhealth" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name} — ${loaderData.specialty} in ${loaderData.city} | cityhealth`;
    const description = `Book an appointment with ${loaderData.name}, ${loaderData.specialty} in ${loaderData.city}. See qualifications, experience, fees and available slots.`;
    return {
      meta: [
        { title }, { name: "description", content: description },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" },
      ]
    };
  },
  component: DoctorPage,
});

function DoctorPage() {
  const { slug } = Route.useParams();
  const { data: doctor } = useSuspenseQuery(doctorQuery(slug));
  if (!doctor) return null;

  return (
    <div className="bg-muted/40 pb-16">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row lg:px-8">
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-navy">{doctor.name}</h1>
            <p className="mt-1 text-primary">{doctor.specialty?.name} · {doctor.qualification}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Award className="size-4" />{doctor.experience_years} years experience</span>
              <span className="flex items-center gap-2"><Star className="size-4 fill-warning text-warning" />{doctor.rating} ({doctor.reviews_count} reviews)</span>
              <span className="flex items-center gap-2"><Building2 className="size-4" />{doctor.hospital?.name}</span>
              <span className="flex items-center gap-2"><MapPin className="size-4" />{doctor.city}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {doctor.available_today && <Badge variant="secondary">Available today</Badge>}
              {doctor.consultation_types?.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>
          </div>
          <div className="h-fit rounded-lg border bg-card p-6 text-center shadow-card md:w-64">
            <p className="text-xs uppercase text-muted-foreground">Consultation fee</p>
            <p className="font-display text-3xl font-bold text-navy">{formatCurrency(doctor.fee)}</p>
            <Button asChild className="mt-4 w-full"><Link to="/book/doctor/$slug" params={{ slug: doctor.slug }}><Calendar />Book appointment</Link></Button>
            <p className="mt-3 text-xs text-muted-foreground">Free cancellation up to 24 hours before.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="About">
            <p className="text-sm leading-7 text-muted-foreground">{doctor.about}</p>
          </Panel>
          <Panel title="Areas of expertise">
            <div className="flex flex-wrap gap-2">{doctor.expertise?.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>
          </Panel>
          <Panel title="Services">
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{doctor.services?.map((item) => <li key={item}>• {item}</li>)}</ul>
          </Panel>
          <Panel title="Education">
            <ul className="space-y-3 text-sm text-muted-foreground">{doctor.education?.map((item) => <li key={item} className="flex gap-3"><GraduationCap className="size-4 shrink-0 text-primary" />{item}</li>)}</ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Available slots">
            <div className="flex flex-wrap gap-2">{doctor.slots?.map((slot) => <span key={slot} className="rounded-md border px-3 py-1.5 text-sm">{slot}</span>)}</div>
            <Button asChild className="mt-5 w-full"><Link to="/book/doctor/$slug" params={{ slug: doctor.slug }}>Choose a slot</Link></Button>
          </Panel>
          <Panel title="Languages">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Languages className="size-4 text-primary" />{doctor.languages?.join(", ")}</p>
          </Panel>
          {doctor.hospital && (
            <Panel title="Hospital">
              <p className="font-semibold">{doctor.hospital.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{doctor.hospital.address}</p>
              <Button asChild variant="outline" className="mt-4 w-full"><Link to="/hospitals/$slug" params={{ slug: doctor.hospital.slug }}>View hospital</Link></Button>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
