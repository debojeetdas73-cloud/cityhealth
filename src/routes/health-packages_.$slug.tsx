import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Mail, MapPin, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { packageQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/health-packages_/$slug")({
  loader: async ({ context, params }) => {
    const pkg = await context.queryClient.ensureQueryData(packageQuery(params.slug));
    if (!pkg) throw notFound();
    return pkg;
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.name ?? "Health package"} | cityhealth` },
    { name: "description", content: loaderData?.description?.slice(0, 155) ?? "Preventive health checkup package details and booking." },
    { property: "og:title", content: `${loaderData?.name ?? "Health package"} | cityhealth` },
    { property: "og:description", content: loaderData?.description?.slice(0, 155) ?? "Health checkup package details." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PackagePage,
  notFoundComponent: () => <p className="p-16 text-center text-muted-foreground">This health package is no longer available.</p>,
  errorComponent: () => <p className="p-16 text-center text-muted-foreground">This package could not be loaded.</p>,
});

function PackagePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(packageQuery(slug));
  if (!data) return null;
  const saving = data.price - data.discounted_price;

  return (
    <div className="bg-muted/40 pb-16">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start lg:px-8">
          <div className="flex-1">
            <Badge variant="secondary">{data.category}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold text-navy">{data.name}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{data.description}</p>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{data.hospital?.name ?? data.city}</span>
              <span className="flex items-center gap-2"><Clock className="size-4 text-primary" />{data.duration}</span>
              <span className="flex items-center gap-2"><Users className="size-4 text-primary" />{data.eligibility}</span>
            </div>
          </div>
          <div className="h-fit rounded-lg border bg-card p-6 text-center shadow-card md:w-72">
            <p className="text-xs uppercase text-muted-foreground">Package price</p>
            <p className="font-display text-3xl font-bold text-navy">{formatCurrency(data.discounted_price)}</p>
            <p className="text-sm text-muted-foreground"><span className="line-through">{formatCurrency(data.price)}</span> · Save {formatCurrency(saving)}</p>
            <Button asChild className="mt-4 w-full"><Link to="/book/package/$slug" params={{ slug: data.slug }}>Book this package</Link></Button>
            <p className="mt-3 text-xs text-muted-foreground">Payment is simulated for demonstration only.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <section className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-navy">Tests included</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {data.tests?.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t}</li>)}
          </ul>
        </section>
        <section className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-navy">Services</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {data.services?.map((s) => <li key={s} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{s}</li>)}
          </ul>
        </section>
        {data.hospital && <section className="rounded-lg border bg-card p-6 shadow-card md:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row">
            <img src={data.hospital.image_url ?? ""} alt={data.hospital.name} className="h-40 w-full rounded-md bg-muted object-cover sm:w-56" />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-navy">Available at {data.hospital.name}</h2>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{data.hospital.address}, {data.hospital.city}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4 text-primary" />{data.hospital.phone}</p>
              {data.hospital.email && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4 text-primary" />{data.hospital.email}</p>}
              <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/hospitals/$slug" params={{ slug: data.hospital.slug }}>View hospital details</Link></Button>
            </div>
          </div>
        </section>}
      </div>
    </div>
  );
}
