import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Bot, Building2, CalendarCheck, Check, ChevronRight, HeartPulse, Search, ShieldCheck, Star, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { doctorsQuery, hospitalsQuery, packagesQuery, plansQuery, specialtiesQuery } from "@/lib/queries";
import heroImage from "@/assets/cityhealth-hero.jpg";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(specialtiesQuery), context.queryClient.ensureQueryData(hospitalsQuery),
    context.queryClient.ensureQueryData(doctorsQuery), context.queryClient.ensureQueryData(packagesQuery), context.queryClient.ensureQueryData(plansQuery),
  ]),
  head: () => ({
    meta: [
      { title: "cityhealth | Find Trusted Healthcare" },
      { name: "description", content: "Search trusted doctors, hospitals and health checkups across India, then book with confidence." },
      { property: "og:title", content: "cityhealth | Find Trusted Healthcare" },
      { property: "og:description", content: "Search trusted doctors, hospitals and health checkups across India." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: specialties } = useSuspenseQuery(specialtiesQuery);
  const { data: hospitals } = useSuspenseQuery(hospitalsQuery);
  const { data: doctors } = useSuspenseQuery(doctorsQuery);
  const { data: packages } = useSuspenseQuery(packagesQuery);
  const { data: plans } = useSuspenseQuery(plansQuery);
  const submit = (event: React.FormEvent) => { event.preventDefault(); void navigate({ to: "/search", search: { q: query } }); };
  return (
    <div>
      <section className="relative min-h-[650px] overflow-hidden bg-mint">
        <img src={heroImage} alt="A doctor speaking with a family in a modern hospital" width={1600} height={1000} className="absolute inset-0 h-full w-full object-cover object-center" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/5" />
        <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl fade-up">
            <Badge className="mb-5 bg-mint text-mint-foreground hover:bg-mint"><ShieldCheck />Trusted healthcare network</Badge>
            <h1 className="font-display text-4xl font-bold leading-tight text-navy sm:text-5xl lg:text-6xl">The right care, without the guesswork.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Describe what you need in your own words. We’ll help you find relevant specialists, hospitals and health checks.</p>
            <form onSubmit={submit} className="mt-8 flex max-w-2xl items-center gap-2 rounded-lg border bg-background p-2 shadow-lift">
              <Search className="ml-3 size-5 shrink-0 text-primary" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Try “skin specialist in Mumbai”" aria-label="Search healthcare" />
              <Button type="submit" size="lg">Search <ArrowRight /></Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>Popular:</span>{["Eye doctor", "Full body checkup", "Cardiologist"].map((term) => <button key={term} onClick={() => void navigate({ to: "/search", search: { q: term } })} className="font-semibold text-primary hover:underline">{term}</button>)}</div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-px sm:grid-cols-4">{[["40+", "Verified doctors"], ["10", "Partner hospitals"], ["12", "Specialties"], ["4.8/5", "Patient rating"]].map(([value, label]) => <div className="px-4 py-7 text-center" key={label}><div className="font-display text-2xl font-bold text-navy">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>)}</div></section>

      <Section eyebrow="Browse by need" title="Care starts with the right specialty" action={{ label: "View all doctors", to: "/search" }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{specialties.slice(0, 12).map((item) => <Link to="/search" search={{ specialty: item.slug }} key={item.id} className="card-lift group rounded-lg border bg-card p-5 text-center shadow-card"><div className="mx-auto grid size-11 place-items-center rounded-md bg-mint text-xl">{item.icon}</div><h3 className="mt-3 text-sm font-semibold">{item.name}</h3><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p></Link>)}</div>
      </Section>

      <Section muted eyebrow="Recommended specialists" title="Doctors patients trust" action={{ label: "Explore all", to: "/search" }}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{doctors.slice(0, 4).map((doctor) => <article key={doctor.id} className="card-lift rounded-lg border bg-card p-5 shadow-card"><div className="flex items-start justify-between gap-2"><div><h3 className="font-display font-semibold text-navy">{doctor.name}</h3><p className="mt-1 text-sm text-primary">{doctor.specialty?.name}</p></div><span className="flex items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-warning text-warning" />{doctor.rating}</span></div><p className="mt-3 text-xs text-muted-foreground">{doctor.experience_years} years · {doctor.hospital?.name}</p><div className="mt-5 flex items-center justify-between"><span className="font-semibold">{formatCurrency(doctor.fee)}</span><Button asChild size="sm"><Link to="/doctors/$slug" params={{ slug: doctor.slug }}>View profile</Link></Button></div></article>)}</div>
      </Section>

      <Section eyebrow="Leading care centres" title="Hospitals near you" action={{ label: "View hospitals", to: "/hospitals" }}>
        <div className="grid gap-5 md:grid-cols-3">{hospitals.slice(0, 3).map((hospital) => <Link to="/hospitals/$slug" params={{ slug: hospital.slug }} key={hospital.id} className="card-lift overflow-hidden rounded-lg border bg-card shadow-card"><div className="aspect-[16/8] overflow-hidden bg-muted"><img src={hospital.image_url ?? ""} alt={hospital.name} loading="lazy" className="h-full w-full object-cover" /></div><div className="p-5"><div className="flex justify-between gap-3"><h3 className="font-display font-semibold text-navy">{hospital.name}</h3>{hospital.emergency && <Badge variant="secondary">24/7 Emergency</Badge>}</div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="size-4" />{hospital.city}</p><p className="mt-4 text-sm text-primary">View departments and doctors <ChevronRight className="inline size-4" /></p></div></Link>)}</div>
      </Section>

      <Section muted eyebrow="Preventive health" title="Popular health checkups" action={{ label: "See all packages", to: "/health-packages" }}>
        <div className="grid gap-5 md:grid-cols-3">{packages.slice(0, 3).map((pkg) => <Link key={pkg.id} to="/health-packages/$slug" params={{ slug: pkg.slug }} className="card-lift rounded-lg border bg-card p-6 shadow-card"><Badge variant="secondary">{pkg.category}</Badge><h3 className="mt-4 font-display text-lg font-semibold text-navy">{pkg.name}</h3><p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p><div className="mt-5 flex items-end justify-between"><div><span className="text-sm text-muted-foreground line-through">{formatCurrency(pkg.price)}</span><div className="font-display text-2xl font-bold">{formatCurrency(pkg.discounted_price)}</div></div><span className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium text-foreground">View details</span></div></Link>)}</div>
      </Section>

      <section className="bg-navy text-navy-foreground"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8"><div><Badge className="bg-primary text-primary-foreground">cityhealth Care</Badge><h2 className="mt-5 font-display text-3xl font-bold">Healthcare savings for the whole family</h2><p className="mt-4 max-w-lg text-navy-foreground/70">Get member discounts on health packages and priority access to trusted care.</p><Button asChild className="mt-7"><Link to="/subscriptions">Compare plans <ArrowRight /></Link></Button></div><div className="grid gap-3 sm:grid-cols-3">{plans.map((plan) => <div key={plan.id} className="rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 p-5"><p className="font-display font-semibold">{plan.name}</p><p className="mt-2 text-2xl font-bold">{formatCurrency(plan.price)}</p><p className="text-xs text-navy-foreground/60">per {plan.period}</p></div>)}</div></div></section>

      <section className="bg-mint"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8"><div><div className="grid size-14 place-items-center rounded-lg bg-primary text-primary-foreground"><Bot className="size-7" /></div><h2 className="mt-5 font-display text-3xl font-bold text-navy">Unsure where to begin?</h2><p className="mt-4 text-muted-foreground">Tell our health assistant what you’re looking for. It can suggest a relevant specialty and help you explore matching care options.</p><p className="mt-4 text-xs text-muted-foreground">cityhealth provides general guidance, not a medical diagnosis.</p><Button asChild className="mt-6"><Link to="/assistant">Ask cityhealth <ArrowRight /></Link></Button></div><div className="grid gap-3">{["Describe your concern in everyday language", "Get a relevant specialty suggestion", "Explore doctors, hospitals and packages"].map((text, index) => <div key={text} className="flex items-center gap-4 rounded-lg border bg-background p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</span><span className="font-semibold">{text}</span></div>)}</div></div></section>
      <section><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="grid gap-8 md:grid-cols-3">{[[BadgeCheck, "Verified profiles", "Clear qualifications, experience and patient ratings."], [CalendarCheck, "Booking made simple", "Choose an available date and slot in a few steps."], [HeartPulse, "Built around your family", "Manage appointments and health details together."]].map(([Icon, title, text]) => { const C = Icon as typeof BadgeCheck; return <div key={String(title)}><C className="size-7 text-primary" /><h3 className="mt-4 font-display font-semibold">{String(title)}</h3><p className="mt-2 text-sm text-muted-foreground">{String(text)}</p></div> })}</div></div></section>
    </div>
  );
}

function Section({ eyebrow, title, action, muted, children }: { eyebrow: string; title: string; action: { label: string; to: "/search" | "/hospitals" | "/health-packages" }; muted?: boolean; children: React.ReactNode }) {
  return <section className={muted ? "bg-muted" : "bg-background"}><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase text-primary">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-bold text-navy">{title}</h2></div><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to={action.to}>{action.label}<ArrowRight /></Link></Button></div>{children}</div></section>;
}
