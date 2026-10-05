import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Phone, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hospitalsQuery } from "@/lib/queries";
import { CITIES } from "@/lib/search";

export const Route = createFileRoute("/hospitals")({
  loader: ({ context }) => context.queryClient.ensureQueryData(hospitalsQuery),
  head: () => ({
    meta: [
      { title: "Partner Hospitals Across India | cityhealth" },
      { name: "description", content: "Browse trusted partner hospitals with departments, facilities, emergency care and doctors you can book." },
      { property: "og:title", content: "Partner Hospitals Across India | cityhealth" },
      { property: "og:description", content: "Browse trusted partner hospitals with departments, facilities and emergency care." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: HospitalsPage,
});

function HospitalsPage() {
  const { data: hospitals } = useSuspenseQuery(hospitalsQuery);
  const [city, setCity] = useState("all");
  const [text, setText] = useState("");

  const visible = hospitals.filter((h) =>
    (city === "all" || h.city === city) && h.name.toLowerCase().includes(text.toLowerCase()));

  return (
    <div className="bg-muted/40 pb-16">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-navy">Partner hospitals</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Multi-speciality care centres with verified departments, facilities and doctors.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search hospitals" className="max-w-xs" aria-label="Search hospitals" />
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {visible.map((hospital) => (
          <Link key={hospital.id} to="/hospitals/$slug" params={{ slug: hospital.slug }} className="card-lift overflow-hidden rounded-lg border bg-card shadow-card">
            <img src={hospital.image_url ?? ""} alt={hospital.name} loading="lazy" className="aspect-[16/9] w-full bg-muted object-cover" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-semibold text-navy">{hospital.name}</h2>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-warning text-warning" />{hospital.rating}</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="size-4" />{hospital.city}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" />{hospital.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hospital.emergency && <Badge variant="secondary">24/7 Emergency</Badge>}
                {hospital.departments?.slice(0, 2).map((d) => <Badge key={d} variant="outline">{d}</Badge>)}
              </div>
            </div>
          </Link>
        ))}
        {!visible.length && <p className="text-muted-foreground">No hospitals matched your filters.</p>}
      </div>
    </div>
  );
}
