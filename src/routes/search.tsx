import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { specialtiesQuery } from "@/lib/queries";
import { listDoctors, logSearch } from "@/lib/data";
import { CITIES, parseQuery } from "@/lib/search";

type SearchParams = {
  q?: string | undefined;
  specialty?: string | undefined;
  city?: string | undefined;
  sort?: string | undefined;
  today?: boolean | undefined;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
    specialty: typeof search["specialty"] === "string" ? (search["specialty"] as string) : undefined,
    city: typeof search["city"] === "string" ? (search["city"] as string) : undefined,
    sort: typeof search["sort"] === "string" ? (search["sort"] as string) : undefined,
    today: search["today"] === true || search["today"] === "true" ? true : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(specialtiesQuery),
  head: () => ({
    meta: [
      { title: "Find Doctors and Specialists | cityhealth" },
      { name: "description", content: "Search verified doctors by specialty, city, fee and availability, then book an appointment in minutes." },
      { property: "og:title", content: "Find Doctors and Specialists | cityhealth" },
      { property: "og:description", content: "Search verified doctors by specialty, city, fee and availability." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ]
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: specialties } = useSuspenseQuery(specialtiesQuery);
  const [text, setText] = useState(params.q ?? "");

  useEffect(() => { setText(params.q ?? ""); }, [params.q]);

  const parsed = params.q ? parseQuery(params.q, specialties) : undefined;
  const specialtySlug = params.specialty ?? parsed?.specialtySlug;
  const city = params.city ?? parsed?.city;

  const filters = {
    ...(specialtySlug ? { specialtySlug } : {}),
    ...(city ? { city } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
    ...(params.today ? { availableToday: true } : {}),
    ...(params.q && !specialtySlug ? { search: params.q } : {}),
  };

  const { data: doctors, isPending } = useQuery({
    queryKey: ["doctor-search", filters],
    queryFn: () => listDoctors(filters),
  });

  useEffect(() => {
    if (!params.q) return;
    void logSearch({ query: params.q, matched_specialty: specialtySlug ?? null, results_count: doctors?.length ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q, specialtySlug]);

  const matched = specialties.find((s) => s.slug === specialtySlug);

  return (
    <div className="bg-muted/40">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-navy">Find the right doctor</h1>
          <form
            className="mt-5 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-card"
            onSubmit={(e) => { e.preventDefault(); void navigate({ to: "/search", search: (prev) => ({ ...prev, q: text, specialty: undefined }) }); }}
          >
            <Search className="ml-3 size-5 shrink-0 text-primary" />
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Search doctors" placeholder="Describe your concern, e.g. “heart specialist in Delhi”" className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
            <Button type="submit">Search</Button>
          </form>
          {matched && (
            <p className="mt-3 text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{matched.name}</span> ({matched.medical_name}){city ? ` in ${city}` : ""}.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg border bg-card p-5 shadow-card">
          <p className="flex items-center gap-2 font-display font-semibold"><SlidersHorizontal className="size-4" />Filters</p>

          <div className="mt-5 space-y-2">
            <Label>Specialty</Label>
            <Select value={specialtySlug ?? "all"} onValueChange={(value) => void navigate({ to: "/search", search: (prev) => ({ ...prev, specialty: value === "all" ? undefined : value }) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-2">
            <Label>City</Label>
            <Select value={city ?? "all"} onValueChange={(value) => void navigate({ to: "/search", search: (prev) => ({ ...prev, city: value === "all" ? undefined : value }) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Sort by</Label>
            <Select value={params.sort ?? "featured"} onValueChange={(value) => void navigate({ to: "/search", search: (prev) => ({ ...prev, sort: value === "featured" ? undefined : value }) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Recommended</SelectItem>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="experience">Most experienced</SelectItem>
                <SelectItem value="fee">Lowest fee</SelectItem>
                <SelectItem value="availability">Available today</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Label htmlFor="today-only">Available today</Label>
            <Switch id="today-only" checked={Boolean(params.today)} onCheckedChange={(checked) => void navigate({ to: "/search", search: (prev) => ({ ...prev, today: checked ? true : undefined }) })} />
          </div>

          <Button variant="ghost" className="mt-5 w-full" onClick={() => void navigate({ to: "/search", search: {} })}>Clear filters</Button>
        </aside>

        <section>
          {isPending ? (
            <div className="grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}</div>
          ) : !doctors?.length ? (
            <div className="rounded-lg border bg-card p-12 text-center shadow-card">
              <h2 className="font-display text-lg font-semibold">No doctors matched that search</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try a different specialty or clear your filters.</p>
              <Button className="mt-5" variant="outline" onClick={() => void navigate({ to: "/search", search: {} })}>Clear filters</Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{doctors.length} doctors found</p>
              <div className="grid gap-4">
                {doctors.map((doctor) => (
                  <article key={doctor.id} className="card-lift flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-card sm:flex-row">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg font-semibold text-navy">{doctor.name}</h2>
                          <p className="text-sm text-primary">{doctor.specialty?.name} · {doctor.qualification}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{doctor.experience_years} years experience · {doctor.hospital?.name}, {doctor.city}</p>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-warning text-warning" />{doctor.rating} <span className="font-normal text-muted-foreground">({doctor.reviews_count})</span></span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {doctor.available_today && <Badge variant="secondary">Available today</Badge>}
                        {doctor.consultation_types?.map((type) => <Badge key={type} variant="outline">{type}</Badge>)}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="font-display text-lg font-bold">{formatCurrency(doctor.fee)} <span className="text-xs font-normal text-muted-foreground">consultation</span></span>
                        <div className="flex gap-2">
                          <Button asChild variant="outline"><Link to="/doctors/$slug" params={{ slug: doctor.slug }}>View profile</Link></Button>
                          <Button asChild><Link to="/book/doctor/$slug" params={{ slug: doctor.slug }}>Book appointment</Link></Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
