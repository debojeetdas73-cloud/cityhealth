/**
 * Typed data-access layer for cityhealth.
 *
 * Every screen reads through these functions. They currently talk to the
 * Supabase Data API; swapping in a Java Spring Boot REST backend later means
 * replacing the bodies here (see docs/API_MAP.md) without touching the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  Appointment,
  Doctor,
  DoctorFilters,
  FamilyMember,
  HealthPackage,
  HealthRecord,
  Hospital,
  PackageBooking,
  Payment,
  Profile,
  Specialty,
  Subscription,
  SubscriptionPlan,
} from "./types";

const DOCTOR_SELECT = "*, specialty:specialties(*), hospital:hospitals(*)";
const PACKAGE_SELECT = "*, hospital:hospitals(*)";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ---------------- Catalogue ---------------- */

export async function listSpecialties(): Promise<Specialty[]> {
  return unwrap<Specialty[]>(
    await supabase.from("specialties").select("*").order("sort_order"),
  );
}

export async function listHospitals(params?: { city?: string; search?: string }): Promise<Hospital[]> {
  let q = supabase.from("hospitals").select("*").order("rating", { ascending: false });
  if (params?.city) q = q.eq("city", params.city);
  if (params?.search) q = q.ilike("name", `%${params.search}%`);
  return unwrap<Hospital[]>(await q);
}

export async function getHospital(slug: string): Promise<Hospital | null> {
  const { data, error } = await supabase.from("hospitals").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Hospital) ?? null;
}

export async function listDoctors(filters: DoctorFilters = {}): Promise<Doctor[]> {
  let q = supabase.from("doctors").select(DOCTOR_SELECT);

  if (filters.specialtySlug) {
    const { data: spec } = await supabase
      .from("specialties")
      .select("id")
      .eq("slug", filters.specialtySlug)
      .maybeSingle();
    if (spec) q = q.eq("specialty_id", (spec as { id: string }).id);
  }
  if (filters.hospitalSlug) {
    const { data: hosp } = await supabase
      .from("hospitals")
      .select("id")
      .eq("slug", filters.hospitalSlug)
      .maybeSingle();
    if (hosp) q = q.eq("hospital_id", (hosp as { id: string }).id);
  }
  if (filters.city) q = q.eq("city", filters.city);
  if (filters.gender) q = q.eq("gender", filters.gender);
  if (filters.availableToday) q = q.eq("available_today", true);
  if (filters.maxFee) q = q.lte("fee", filters.maxFee);
  if (filters.minExperience) q = q.gte("experience_years", filters.minExperience);
  if (filters.minRating) q = q.gte("rating", filters.minRating);
  if (filters.search) q = q.ilike("name", `%${filters.search}%`);
  if (filters.consultationType) q = q.contains("consultation_types", [filters.consultationType]);

  switch (filters.sort) {
    case "rating":
      q = q.order("rating", { ascending: false });
      break;
    case "experience":
      q = q.order("experience_years", { ascending: false });
      break;
    case "fee":
      q = q.order("fee", { ascending: true });
      break;
    case "availability":
      q = q.order("available_today", { ascending: false }).order("rating", { ascending: false });
      break;
    default:
      q = q.order("featured", { ascending: false }).order("rating", { ascending: false });
  }

  return unwrap<Doctor[]>(await q);
}

export async function getDoctor(slug: string): Promise<Doctor | null> {
  const { data, error } = await supabase.from("doctors").select(DOCTOR_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Doctor) ?? null;
}

export async function listPackages(params?: {
  hospitalSlug?: string;
  city?: string;
  category?: string;
  search?: string;
}): Promise<HealthPackage[]> {
  let q = supabase.from("health_packages").select(PACKAGE_SELECT).order("featured", { ascending: false });
  if (params?.city) q = q.eq("city", params.city);
  if (params?.category) q = q.eq("category", params.category);
  if (params?.search) q = q.ilike("name", `%${params.search}%`);
  const rows = unwrap<HealthPackage[]>(await q);
  if (params?.hospitalSlug) return rows.filter((p) => p.hospital?.slug === params.hospitalSlug);
  return rows;
}

export async function getPackage(slug: string): Promise<HealthPackage | null> {
  const { data, error } = await supabase
    .from("health_packages")
    .select(PACKAGE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as HealthPackage) ?? null;
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return unwrap<SubscriptionPlan[]>(
    await supabase.from("subscription_plans").select("*").order("sort_order"),
  );
}

/* ---------------- Patient ---------------- */

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function listFamilyMembers(userId: string): Promise<FamilyMember[]> {
  return unwrap<FamilyMember[]>(
    await supabase.from("family_members").select("*").eq("user_id", userId).order("created_at"),
  );
}

export async function addFamilyMember(member: Omit<FamilyMember, "id">): Promise<void> {
  const { error } = await supabase.from("family_members").insert(member);
  if (error) throw new Error(error.message);
}

export async function updateFamilyMember(
  id: string,
  patch: Partial<Omit<FamilyMember, "id" | "user_id">>,
): Promise<void> {
  const { error } = await supabase.from("family_members").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listHealthRecords(userId: string): Promise<HealthRecord[]> {
  return unwrap<HealthRecord[]>(
    await supabase.from("health_records").select("*").eq("user_id", userId).order("record_date", { ascending: false }),
  );
}

export async function addHealthRecord(record: Omit<HealthRecord, "id">): Promise<void> {
  const { error } = await supabase.from("health_records").insert(record);
  if (error) throw new Error(error.message);
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const { error } = await supabase.from("health_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Appointments ---------------- */

const APPOINTMENT_SELECT = `*, doctor:doctors(*, specialty:specialties(*)), hospital:hospitals(*)`;

export async function listAppointments(userId: string): Promise<Appointment[]> {
  return unwrap<Appointment[]>(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("user_id", userId)
      .order("appointment_date", { ascending: false }),
  );
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Appointment) ?? null;
}

export async function createAppointment(
  input: Omit<Appointment, "id" | "booking_ref" | "created_at" | "status" | "doctor" | "hospital"> & {
    status?: Appointment["status"];
  },
): Promise<Appointment> {
  const { data, error } = await supabase.from("appointments").insert(input as Database["public"]["Tables"]["appointments"]["Insert"]).select(APPOINTMENT_SELECT).single();
  if (error) throw new Error(error.message);
  return data as Appointment;
}

export async function updateAppointment(id: string, patch: Database["public"]["Tables"]["appointments"]["Update"]): Promise<void> {
  const { error } = await supabase.from("appointments").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Package bookings ---------------- */

const PACKAGE_BOOKING_SELECT = `*, health_package:health_packages(*), hospital:hospitals(*)`;

export async function listPackageBookings(userId: string): Promise<PackageBooking[]> {
  return unwrap<PackageBooking[]>(
    await supabase
      .from("package_bookings")
      .select(PACKAGE_BOOKING_SELECT)
      .eq("user_id", userId)
      .order("booking_date", { ascending: false }),
  );
}

export async function createPackageBooking(
  input: Omit<PackageBooking, "id" | "booking_ref" | "created_at" | "status" | "health_package" | "hospital"> & {
    status?: PackageBooking["status"];
  },
): Promise<PackageBooking> {
  const { data, error } = await supabase
    .from("package_bookings")
    .insert(input as Database["public"]["Tables"]["package_bookings"]["Insert"])
    .select(PACKAGE_BOOKING_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as PackageBooking;
}

export async function updatePackageBooking(id: string, patch: Database["public"]["Tables"]["package_bookings"]["Update"]): Promise<void> {
  const { error } = await supabase.from("package_bookings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Subscriptions ---------------- */

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Subscription) ?? null;
}

export async function createSubscription(userId: string, planId: string): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: userId, plan_id: planId, status: "active" })
    .select("*, plan:subscription_plans(*)")
    .single();
  if (error) throw new Error(error.message);
  return data as Subscription;
}

export async function cancelSubscription(id: string): Promise<void> {
  const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Demo payments ---------------- */

export async function recordPayment(input: {
  user_id: string;
  booking_id?: string | null;
  payment_type: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_status: "pending" | "successful" | "failed" | "refunded";
}): Promise<Payment> {
  const { data, error } = await supabase.from("payments").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data as Payment;
}

export async function listPayments(userId: string): Promise<Payment[]> {
  return unwrap<Payment[]>(
    await supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  );
}

/* ---------------- Search analytics ---------------- */

export async function logSearch(input: {
  query: string;
  matched_specialty?: string | null;
  results_count?: number;
  user_id?: string | null;
}): Promise<void> {
  await supabase.from("search_logs").insert({
    query: input.query,
    matched_specialty: input.matched_specialty ?? null,
    results_count: input.results_count ?? 0,
    user_id: input.user_id ?? null,
  });
}

/* ---------------- Admin ---------------- */

export async function adminStats() {
  const [doctors, hospitals, packages, appointments, payments, subs, users, searches] = await Promise.all([
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase.from("hospitals").select("id", { count: "exact", head: true }),
    supabase.from("health_packages").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id, status, total, created_at"),
    supabase.from("payments").select("id, amount, payment_status, payment_method, created_at, transaction_id"),
    supabase.from("subscriptions").select("id, status"),
    supabase.from("profiles").select("id, full_name, email, phone, city, created_at"),
    supabase.from("search_logs").select("query, matched_specialty, created_at"),
  ]);
  return {
    doctorCount: doctors.count ?? 0,
    hospitalCount: hospitals.count ?? 0,
    packageCount: packages.count ?? 0,
    appointments: (appointments.data ?? []) as { id: string; status: string; total: number; created_at: string }[],
    payments: (payments.data ?? []) as Payment[],
    subscriptions: (subs.data ?? []) as { id: string; status: string }[],
    users: (users.data ?? []) as (Profile & { created_at: string })[],
    searches: (searches.data ?? []) as { query: string; matched_specialty: string | null; created_at: string }[],
  };
}

export async function adminAllAppointments(): Promise<Appointment[]> {
  return unwrap<Appointment[]>(
    await supabase.from("appointments").select(APPOINTMENT_SELECT).order("created_at", { ascending: false }),
  );
}

export async function adminAllPackageBookings(): Promise<PackageBooking[]> {
  return unwrap<PackageBooking[]>(
    await supabase.from("package_bookings").select(PACKAGE_BOOKING_SELECT).order("created_at", { ascending: false }),
  );
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
