import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, Phone, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { hospitalQuery } from "@/lib/queries";
import { listDoctors, listPackages } from "@/lib/data";

export const Route = createFileRoute("/hospitals_/$slug")({
  loader: async ({ context, params }) => {
    const hospital = await context.queryClient.ensureQueryData(hospitalQuery(params.slug));
    if (!hospital) throw notFound();
    return { name: hospital.name, city: hospital.city };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Hospital not found | cityhealth" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name}, ${loaderData.city} | cityhealth`;
    const description = `Departments, facilities, doctors and health packages at ${loaderData.name} in ${loaderData.city}.`;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: HospitalPage,
});

function HospitalPage() {
  const { slug } = Route.useParams();
  const { data: hospital } = useSuspenseQuery(hospitalQuery(slug));
  const { data: doctors, isPending } = useQuery({ queryKey: ["hospital-doctors", slug], queryFn: () => listDoctors({ hospitalSlug: slug }) });
  const { data: packages } = useQuery({ queryKey: ["hospital-packages", slug], queryFn: () => listPackages({ hospitalSlug: slug }) });
  if (!hospital) return null;

  return (
    <div className="bg-muted/40 pb-16">
      <div className="relative h-64 bg-navy">
        <img src={hospital.image_url ?? ""} alt={hospital.name} className="h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <h1 className="font-display text-3xl font-bold text-navy-foreground">{hospital.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-navy-foreground/80"><MapPin className="size-4" />{hospital.address}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="About">
            <p className="text-sm leading-7 text-muted-foreground">{hospital.about}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Rating" value={`${hospital.rating}`} />
              <Stat label="Reviews" value={`${hospital.reviews_count}`} />
              <Stat label="Beds" value={hospital.beds ? String(hospital.beds) : "—"} />
              <Stat label="Established" value={hospital.established ? String(hospital.established) : "—"} />
            </div>
          </Panel>

          <Panel title="Departments">
            <div className="flex flex-wrap gap-2">{hospital.departments?.map((d) => <Badge key={d} variant="secondary">{d}</Badge>)}</div>
          </Panel>

          <Panel title="Doctors at this hospital">
            {isPending ? <Skeleton className="h-24 w-full" /> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {doctors?.map((doctor) => (
                  <div key={doctor.id} className="flex gap-4 rounded-md border p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{doctor.name}</p>
                      <p className="text-xs text-primary">{doctor.specialty?.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3 fill-warning text-warning" />{doctor.rating} · {formatCurrency(doctor.fee)}</p>
                      <Link to="/doctors/$slug" params={{ slug: doctor.slug }} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">View profile</Link>
                    </div>
                  </div>
                ))}
                {!doctors?.length && <p className="text-sm text-muted-foreground">No doctors listed yet.</p>}
              </div>
            )}
          </Panel>

          {!!packages?.length && (
            <Panel title="Health packages here">
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-md border p-4">
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{pkg.tests?.length ?? 0} tests · {pkg.duration}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-display font-bold">{formatCurrency(pkg.discounted_price)}</span>
                      <Button asChild size="sm" variant="outline"><Link to="/health-packages/$slug" params={{ slug: pkg.slug }}>Details</Link></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Contact">
            <p className="flex items-center gap-2 text-sm"><Phone className="size-4 text-primary" />{hospital.phone}</p>
            {hospital.email && <p className="mt-2 flex items-center gap-2 text-sm"><Mail className="size-4 text-primary" />{hospital.email}</p>}
            <p className="mt-2 flex items-center gap-2 text-sm"><Clock className="size-4 text-primary" />{hospital.hours}</p>
            {hospital.emergency && <Badge className="mt-4" variant="secondary">24/7 Emergency available</Badge>}
          </Panel>
          <Panel title="Facilities">
            <ul className="space-y-2 text-sm text-muted-foreground">{hospital.facilities?.map((f) => <li key={f}>• {f}</li>)}</ul>
          </Panel>
          <Panel title="Services">
            <ul className="space-y-2 text-sm text-muted-foreground">{hospital.services?.map((s) => <li key={s}>• {s}</li>)}</ul>
          </Panel>
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted p-3 text-center"><p className="font-display text-lg font-bold text-navy">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
