import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Hospital,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard | cityhealth" }] }),
  component: AdminPage,
});

type Tab =
  "overview" | "doctors" | "hospitals" | "specialties" | "packages" | "appointments" | "users";
type AppRole = SupabaseDatabase["public"]["Enums"]["app_role"];
const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "hospitals", label: "Hospitals", icon: Hospital },
  { id: "specialties", label: "Specialties", icon: Activity },
  { id: "packages", label: "Packages", icon: Database },
  { id: "appointments", label: "Appointments", icon: CalendarCheck },
  { id: "users", label: "Users & roles", icon: Users },
];

function AdminPage() {
  return (
    <AuthGate title="Sign in to access the admin panel">
      <Admin />
    </AuthGate>
  );
}

function Admin() {
  const { user, signOut } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (user) void checkAdmin();
  }, [user]);
  useEffect(() => {
    if (allowed) void loadStats();
  }, [allowed]);

  async function checkAdmin() {
    if (!user) return;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      setAllowed(false);
      return;
    }
    const roles = data ?? [];
    const superAdmin = roles.some((row) => row.role === "super_admin");
    setIsSuperAdmin(superAdmin);
    setAllowed(superAdmin || roles.some((row) => row.role === "admin"));
  }

  async function count(table: string) {
    const result = await (supabase.from as any)(table).select("id", { count: "exact", head: true });
    if (result.error) return 0;
    return result.count ?? 0;
  }

  async function loadStats() {
    setRefreshing(true);
    const entries = await Promise.all(
      [
        "profiles",
        "doctors",
        "hospitals",
        "specialties",
        "health_packages",
        "appointments",
        "package_bookings",
        "subscriptions",
        "payments",
        "search_logs",
        "chat_conversations",
      ].map(async (table) => [table, await count(table)] as const),
    );
    setStats(Object.fromEntries(entries));
    setRefreshing(false);
  }

  if (allowed === null)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  if (!allowed)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-12 text-destructive" />
        <h1 className="mt-5 font-display text-2xl font-bold text-navy">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is signed in, but it does not have the admin role.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return home</Link>
        </Button>
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-100px)] bg-muted/20">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_1fr]">
        <aside className="hidden border-r bg-card lg:block">
          <div className="sticky top-[72px] p-4">
            <div className="mb-6 px-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                cityhealth
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-navy">Admin Console</h2>
            </div>
            <nav className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${tab === id ? "bg-mint text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-8 border-t pt-4">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">Control centre</p>
              <h1 className="font-display text-3xl font-bold text-navy">
                {tabs.find((item) => item.id === tab)?.label}
              </h1>
            </div>
            <Button variant="outline" onClick={() => void loadStats()} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
            {tabs.map(({ id, label }) => (
              <Button
                key={id}
                size="sm"
                variant={tab === id ? "default" : "outline"}
                onClick={() => setTab(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          {tab === "overview" && <Overview stats={stats} />}
          {tab === "doctors" && (
            <CrudTable
              table="doctors"
              title="Doctors"
              fields={[
                "name",
                "slug",
                "specialty_id",
                "hospital_id",
                "city",
                "qualification",
                "experience_years",
                "fee",
                "rating",
                "available_today",
                "featured",
              ]}
            />
          )}
          {tab === "hospitals" && (
            <CrudTable
              table="hospitals"
              title="Hospitals"
              fields={[
                "name",
                "slug",
                "city",
                "address",
                "phone",
                "rating",
                "beds",
                "emergency",
                "featured",
              ]}
            />
          )}
          {tab === "specialties" && (
            <CrudTable
              table="specialties"
              title="Specialties"
              fields={["name", "slug", "medical_name", "description", "sort_order"]}
            />
          )}
          {tab === "packages" && (
            <CrudTable
              table="health_packages"
              title="Health packages"
              fields={[
                "name",
                "slug",
                "hospital_id",
                "price",
                "discounted_price",
                "category",
                "city",
                "duration",
                "featured",
              ]}
            />
          )}
          {tab === "appointments" && <Appointments />}
          {tab === "users" && <UsersRoles isSuperAdmin={isSuperAdmin} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ stats }: { stats: Record<string, number> }) {
  const cards = [
    ["profiles", "Patients", Users],
    ["doctors", "Doctors", Stethoscope],
    ["hospitals", "Hospitals", Hospital],
    ["appointments", "Appointments", CalendarCheck],
    ["package_bookings", "Package bookings", Database],
    ["payments", "Payments", CircleDollarSign],
    ["search_logs", "Searches", Search],
    ["chat_conversations", "AI conversations", Activity],
  ] as const;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, label, Icon]) => (
          <Card key={key}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-3xl font-bold text-navy">{stats[key] ?? 0}</p>
              </div>
              <div className="grid size-11 place-items-center rounded-xl bg-mint text-primary">
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthRow
              label="Catalogue"
              value={`${stats["doctors"] ?? 0} doctors · ${stats["hospitals"] ?? 0} hospitals`}
            />
            <HealthRow
              label="Care inventory"
              value={`${stats["specialties"] ?? 0} specialties · ${stats["health_packages"] ?? 0} packages`}
            />
            <HealthRow
              label="Engagement"
              value={`${stats["search_logs"] ?? 0} searches · ${stats["chat_conversations"] ?? 0} AI chats`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admin checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              Keep doctor and hospital information current.
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              Review pending appointments regularly.
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              Use the AI conversation count as a product-health signal.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function CrudTable({ table, title, fields }: { table: string; title: string; fields: string[] }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);
  async function load() {
    setBusy(true);
    const select =
      table === "health_packages"
        ? `${fields.join(",")},hospital:hospitals(name)`
        : fields.join(",");
    const result = await (supabase.from as any)(table)
      .select(select)
      .order(fields.includes("name") ? "name" : fields[0])
      .limit(200);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setRows(result.data ?? []);
  }
  useEffect(() => {
    void load();
  }, [table]);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        fields.some((field) =>
          String(
            table === "health_packages" && field === "hospital_id"
              ? ((row["hospital"] as { name?: string } | null)?.name ?? "")
              : (row[field] ?? ""),
          )
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      ),
    [rows, search, fields],
  );
  async function remove(row: Record<string, unknown>) {
    if (!confirm(`Delete this ${title.toLowerCase().replace(/s$/, "")}?`)) return;
    const result = await (supabase.from as any)(table).delete().eq("id", row["id"]);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success("Deleted");
      void load();
    }
  }
  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage up to 200 records from the admin console.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing({});
            setOpen(true);
          }}
        >
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw />
          </Button>
        </div>
        {busy ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {fields.slice(0, 7).map((field) => (
                    <th key={field} className="px-4 py-3 text-left font-semibold capitalize">
                      {table === "health_packages" && field === "hospital_id"
                        ? "Hospital name"
                        : field.replaceAll("_", " ")}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={String(row["id"])} className="border-t">
                    <>
                      {fields.slice(0, 7).map((field) => (
                        <td key={field} className="max-w-[260px] truncate px-4 py-3">
                          {formatValue(
                            table === "health_packages" && field === "hospital_id"
                              ? (row["hospital"] as { name?: string } | null)?.name
                              : row[field],
                          )}
                        </td>
                      ))}
                    </>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void remove(row)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <CrudDialog
          table={table}
          fields={fields}
          row={editing}
          open={open}
          onOpenChange={setOpen}
          onSaved={() => void load()}
        />
      </CardContent>
    </Card>
  );
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value ?? "—");
}

function CrudDialog({
  table,
  fields,
  row,
  open,
  onOpenChange,
  onSaved,
}: {
  table: string;
  fields: string[];
  row: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [hospitalMatches, setHospitalMatches] = useState<{ id: string; name: string }[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  useEffect(() => {
    if (row) {
      setForm(
        Object.fromEntries(
          fields.map((field) => [
            field,
            Array.isArray(row[field])
              ? (row[field] as unknown[]).join(", ")
              : String(row[field] ?? ""),
          ]),
        ),
      );
      if (table === "health_packages") {
        const hospital = row["hospital"] as { id?: string; name?: string } | null;
        const hospitalId = String(row["hospital_id"] ?? hospital?.id ?? "");
        setSelectedHospital(
          hospitalId && hospital?.name ? { id: hospitalId, name: hospital.name } : null,
        );
        setHospitalSearch(hospital?.name ?? "");
      } else {
        setSelectedHospital(null);
        setHospitalSearch("");
      }
    }
  }, [row, fields]);

  useEffect(() => {
    if (table !== "health_packages" || selectedHospital || hospitalSearch.trim().length < 2) {
      setHospitalMatches([]);
      setSearchingHospitals(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearchingHospitals(true);
      const { data, error } = await supabase
        .from("hospitals")
        .select("id,name")
        .ilike("name", `%${hospitalSearch.trim()}%`)
        .order("name")
        .limit(8);

      if (!active) return;
      setSearchingHospitals(false);
      if (error) {
        toast.error(error.message);
        setHospitalMatches([]);
        return;
      }
      setHospitalMatches(data ?? []);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [table, hospitalSearch, selectedHospital]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (table === "health_packages" && !selectedHospital) {
      toast.error("Search for and select a hospital.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = form[field] ?? "";
      if (
        [
          "experience_years",
          "fee",
          "rating",
          "reviews_count",
          "beds",
          "established",
          "price",
          "discounted_price",
          "sort_order",
        ].includes(field)
      )
        payload[field] = Number(value) || 0;
      else if (["available_today", "featured", "emergency"].includes(field))
        payload[field] = value === "true";
      else if (["departments", "services", "facilities", "tests"].includes(field))
        payload[field] = value
          ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [];
      else payload[field] = value;
    }
    const result = row?.["id"]
      ? await (supabase.from as any)(table).update(payload).eq("id", row["id"])
      : await (supabase.from as any)(table).insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(row?.["id"] ? "Updated" : "Created");
    onOpenChange(false);
    onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row?.["id"] ? "Edit" : "Add"} record</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label>
                {table === "health_packages" && field === "hospital_id"
                  ? "Hospital name"
                  : field.replaceAll("_", " ")}
              </Label>
              {table === "health_packages" && field === "hospital_id" ? (
                <div className="relative">
                  <Input
                    value={hospitalSearch}
                    onChange={(event) => {
                      setHospitalSearch(event.target.value);
                      setSelectedHospital(null);
                      setForm((current) => ({ ...current, hospital_id: "" }));
                    }}
                    placeholder="Type a hospital name"
                    autoComplete="off"
                    required
                  />
                  {searchingHospitals && (
                    <p className="mt-1 text-sm text-muted-foreground">Searching hospitals…</p>
                  )}
                  {hospitalMatches.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                      {hospitalMatches.map((hospital) => (
                        <button
                          key={hospital.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setSelectedHospital(hospital);
                            setHospitalSearch(hospital.name);
                            setForm((current) => ({
                              ...current,
                              hospital_id: hospital.id,
                            }));
                            setHospitalMatches([]);
                          }}
                        >
                          {hospital.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {hospitalSearch.trim().length >= 2 &&
                    !searchingHospitals &&
                    !selectedHospital &&
                    hospitalMatches.length === 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        No matching hospitals found.
                      </p>
                    )}
                </div>
              ) : ["available_today", "featured", "emergency"].includes(field) ? (
                <Select
                  value={form[field] || "false"}
                  onValueChange={(value) => setForm((current) => ({ ...current, [field]: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form[field] ?? ""}
                  onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))}
                  required={!["description", "address", "phone"].includes(field)}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Appointments() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  async function load() {
    setBusy(true);
    const result = await supabase
      .from("appointments")
      .select(
        "id,booking_ref,patient_name,patient_phone,appointment_date,appointment_time,consultation_type,status,fee,created_at,doctor:doctors(name),hospital:hospitals(name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setRows((result.data ?? []) as unknown as Record<string, unknown>[]);
  }
  useEffect(() => {
    void load();
  }, []);
  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: status as "pending" | "confirmed" | "completed" | "cancelled" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Appointment updated");
      void load();
    }
  }
  const filtered = rows.filter((row) =>
    ["booking_ref", "patient_name", "patient_phone", "status"].some((field) =>
      String(row[field] ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );
  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Appointments</CardTitle>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings…"
          />
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {busy ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Reference",
                    "Patient",
                    "Doctor",
                    "Hospital",
                    "Date",
                    "Type",
                    "Status",
                    "Total",
                    "Action",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3 text-left font-semibold">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={String(row["id"])} className="border-t">
                    <td className="px-4 py-3 font-semibold">{String(row["booking_ref"])}</td>
                    <td className="px-4 py-3">
                      {String(row["patient_name"])}
                      <div className="text-xs text-muted-foreground">
                        {String(row["patient_phone"])}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {String((row["doctor"] as { name?: string })?.name ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      {String((row["hospital"] as { name?: string })?.name ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      {String(row["appointment_date"])}
                      <div className="text-xs text-muted-foreground">
                        {String(row["appointment_time"])}
                      </div>
                    </td>
                    <td className="px-4 py-3">{String(row["consultation_type"])}</td>
                    <td className="px-4 py-3">
                      <Badge>{String(row["status"])}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      ₹{Number(row["fee"] ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={String(row["status"])}
                        onValueChange={(value) => void updateStatus(String(row["id"]), value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["pending", "confirmed", "completed", "cancelled"].map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsersRoles({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  type ProfileMatch = { id: string; full_name: string; email: string | null };
  type RoleRow = {
    user_id: string;
    role: AppRole;
    created_at: string;
    profile: ProfileMatch | null;
  };
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>("admin");
  const { user } = useAuth();
  async function load() {
    setBusy(true);
    const result = await supabase
      .from("user_roles")
      .select("user_id,role,created_at")
      .order("created_at", { ascending: false });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message);
      return;
    }

    const roleRows = result.data ?? [];
    const userIds = [...new Set(roleRows.map((row) => row.user_id))];
    const profiles = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
      : { data: [], error: null };
    setBusy(false);
    if (profiles.error) {
      toast.error(profiles.error.message);
      return;
    }
    const profilesById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
    setRows(
      roleRows.map((row) => ({
        ...row,
        profile: profilesById.get(row.user_id) ?? null,
      })),
    );
  }
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const query = userSearch.trim();
    if (query.length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      const pattern = `%${query}%`;
      const [emailMatches, nameMatches] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").ilike("email", pattern).limit(10),
        supabase
          .from("profiles")
          .select("id,full_name,email")
          .ilike("full_name", pattern)
          .limit(10),
      ]);

      if (!active) return;
      if (emailMatches.error || nameMatches.error) {
        setSearching(false);
        toast.error(
          emailMatches.error?.message ?? nameMatches.error?.message ?? "User search failed",
        );
        return;
      }

      const uniqueMatches = new Map<string, ProfileMatch>();
      for (const profile of [...(emailMatches.data ?? []), ...(nameMatches.data ?? [])]) {
        uniqueMatches.set(profile.id, profile);
      }
      setMatches([...uniqueMatches.values()].slice(0, 10));
      setSearching(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userSearch]);

  async function changeRole(userId: string, currentRole: AppRole, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("user_id", userId)
      .eq("role", currentRole);
    if (error) toast.error(error.message);
    else {
      toast.success("Role updated");
      void load();
    }
  }

  async function addRole(profile: ProfileMatch) {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.id, role: newRole });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `${newRole.replace("_", " ")} role added for ${profile.email ?? profile.full_name}`,
    );
    setUserSearch("");
    setMatches([]);
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users & roles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Super admins can grant and change roles. Admins can view roles but cannot change them.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 max-w-2xl space-y-3">
          <div className="flex gap-2">
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users by email or name"
              aria-label="Search users by email or name"
            />
            {isSuperAdmin && (
              <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">patient</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="super_admin">super admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {searching && <p className="text-sm text-muted-foreground">Searching users…</p>}
          {matches.length > 0 && (
            <div className="divide-y rounded-md border">
              {matches.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {profile.full_name || "Name not provided"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile.email || "Email not available"}
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <Button
                      size="sm"
                      disabled={profile.id === user?.id}
                      onClick={() => void addRole(profile)}
                    >
                      Add role
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {userSearch.trim().length >= 2 && !searching && matches.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching users found.</p>
          )}
        </div>
        {busy ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.user_id}-${row.role}`} className="border-t">
                    <td className="px-4 py-3">{row.profile?.full_name || "Name not provided"}</td>
                    <td className="px-4 py-3">{row.profile?.email || "Email not available"}</td>
                    <td className="px-4 py-3">
                      <Badge>{row.role}</Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {row.user_id !== user?.id && isSuperAdmin && (
                        <Select
                          value={row.role}
                          onValueChange={(value) =>
                            void changeRole(row.user_id, row.role, value as AppRole)
                          }
                        >
                          <SelectTrigger className="ml-auto w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patient">patient</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="super_admin">super admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
