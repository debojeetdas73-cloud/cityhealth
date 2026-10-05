import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { packagesQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { CITIES } from "@/lib/search";

export const Route = createFileRoute("/health-packages")({
  loader: ({ context }) => context.queryClient.ensureQueryData(packagesQuery),
  head: () => ({
    meta: [
      { title: "Preventive Health Checkup Packages | cityhealth" },
      { name: "description", content: "Compare full-body, cardiac, diabetes and women's health checkup packages from trusted hospitals and book online." },
      { property: "og:title", content: "Preventive Health Checkup Packages | cityhealth" },
      { property: "og:description", content: "Compare and book preventive health checkup packages from trusted hospitals." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: PackagesPage,
  errorComponent: () => <p className="p-12 text-center text-muted-foreground">Health packages could not be loaded.</p>,
});

function PackagesPage() {
  const { data: packages } = useSuspenseQuery(packagesQuery);
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [text, setText] = useState("");

  const categories = Array.from(new Set(packages.map((p) => p.category))).sort();
  const visible = packages.filter((p) =>
    (city === "all" || p.city === city) &&
    (category === "all" || p.category === category) &&
    p.name.toLowerCase().includes(text.toLowerCase()));

  return (
    <div className="bg-muted/40 pb-16">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-navy">Health checkup packages</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Preventive screening bundles with transparent pricing, from partner hospitals near you.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search packages" className="max-w-xs" aria-label="Search packages" />
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {visible.map((pkg) => (
          <Link key={pkg.id} to="/health-packages/$slug" params={{ slug: pkg.slug }} className="card-lift flex flex-col rounded-lg border bg-card p-5 shadow-card">
            <Badge variant="secondary" className="w-fit">{pkg.category}</Badge>
            <h2 className="mt-3 font-display font-semibold text-navy">{pkg.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{pkg.description}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{pkg.hospital?.name ?? pkg.city}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" />{pkg.duration}</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-navy">{formatCurrency(pkg.discounted_price)}</span>
              <span className="text-sm text-muted-foreground line-through">{formatCurrency(pkg.price)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{pkg.tests?.length ?? 0} tests included</p>
          </Link>
        ))}
        {!visible.length && <p className="text-muted-foreground">No packages matched your filters.</p>}
      </div>
    </div>
  );
}
