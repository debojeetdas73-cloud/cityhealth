import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
    Building2,
    CalendarDays,
    Stethoscope,
    Users,
    LogOut,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/hospital-admin")({
    component: HospitalAdminDashboard,
});

type Hospital = {
    id: string;
    name: string;
    slug: string;
    city: string;
    address: string;
    phone: string;
    email: string | null;
    rating: number;
    reviews_count: number;
    beds: number | null;
    hours: string;
    emergency: boolean;
    image_url: string | null;
    about: string;
};

type Membership = {
    id: string;
    user_id: string;
    hospital_id: string;
    role: string;
};

type Doctor = {
    id: string;
    name: string;
    slug: string;
    city: string;
    qualification: string;
    experience_years: number;
    fee: number;
    gender: string;
    photo_url: string | null;
};

type Appointment = {
    id: string;
    booking_ref: string;
    patient_name: string;
    patient_phone: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    fee: number;
    doctor_id: string;
};

type Tab =
    | "overview"
    | "hospital"
    | "doctors"
    | "appointments"
    | "staff";

function HospitalAdminDashboard() {
    const { user, signOut } = useAuth();

    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    const [membership, setMembership] = useState<Membership | null>(null);
    const [hospital, setHospital] = useState<Hospital | null>(null);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    const [activeTab, setActiveTab] = useState<Tab>("overview");

    const [error, setError] = useState("");

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        loadHospitalAdmin();
    }, [user]);

    async function loadHospitalAdmin() {
        if (!user) return;

        setLoading(true);
        setError("");

        try {
            /*
             * ----------------------------------------------------
             * 1. Check the current user's role and hospital access.
             *    The project schema stores hospital access through the
             *    public.hospitals table, while admin membership is tracked
             *    via user_roles. This route is intentionally kept compatible
             *    with the currently available schema.
             * ----------------------------------------------------
             */

            const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .in("role", ["admin", "super_admin"])
                .limit(1)
                .maybeSingle();

            if (roleError) {
                console.error(roleError);
                throw new Error(roleError.message);
            }

            if (!roleData) {
                setAuthorized(false);
                setMembership(null);
                setHospital(null);
                setLoading(false);
                return;
            }

            const { data: hospitalData, error: hospitalError } = await supabase
                .from("hospitals")
                .select(
                    `
              id,
              name,
              slug,
              city,
              address,
              phone,
              email,
              rating,
              reviews_count,
              beds,
              hours,
              emergency,
              image_url,
              about
            `
                )
                .limit(1)
                .maybeSingle();

            if (hospitalError) {
                console.error(hospitalError);
                throw new Error(hospitalError.message);
            }

            if (!hospitalData) {
                setAuthorized(false);
                setMembership(null);
                setHospital(null);
                setLoading(false);
                return;
            }

            const nextMembership: Membership = {
                id: user.id,
                user_id: user.id,
                hospital_id: hospitalData.id,
                role: "admin",
            };

            setMembership(nextMembership);
            setAuthorized(true);
            setHospital(hospitalData);

            /*
             * ----------------------------------------------------
             * 2. Load doctors belonging to the assigned hospital
             * ----------------------------------------------------
             */

            const { data: doctorData, error: doctorError } = await supabase
                .from("doctors")
                .select(
                    `
            id,
            name,
            slug,
            city,
            qualification,
            experience_years,
            fee,
            gender,
            photo_url
          `
                )
                .eq("hospital_id", hospitalData.id)
                .order("name");

            if (doctorError) {
                console.error(doctorError);
            } else {
                setDoctors(doctorData ?? []);
            }

            /*
             * ----------------------------------------------------
             * 3. Load appointments belonging to the assigned hospital
             * ----------------------------------------------------
             */

            const { data: appointmentData, error: appointmentError } =
                await supabase
                    .from("appointments")
                    .select(
                        `
              id,
              booking_ref,
              patient_name,
              patient_phone,
              appointment_date,
              appointment_time,
              status,
              fee,
              doctor_id
            `
                    )
                    .eq("hospital_id", hospitalData.id)
                    .order("appointment_date", { ascending: false });

            if (appointmentError) {
                console.error(appointmentError);
            } else {
                setAppointments(appointmentData ?? []);
            }
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load hospital dashboard."
            );
        } finally {
            setLoading(false);
        }
    }

    async function updateAppointmentStatus(
        appointmentId: string,
        status: "pending" | "confirmed" | "completed" | "cancelled"
    ) {
        const hospitalId = membership?.hospital_id ?? hospital?.id;
        if (!hospitalId) return;

        const { error } = await supabase
            .from("appointments")
            .update({ status })
            .eq("id", appointmentId)
            .eq("hospital_id", hospitalId);

        if (error) {
            alert(error.message);
            return;
        }

        setAppointments((current) =>
            current.map((appointment) =>
                appointment.id === appointmentId
                    ? { ...appointment, status }
                    : appointment
            )
        );
    }

    async function handleLogout() {
        await signOut();
    }

    /*
     * --------------------------------------------------------
     * Loading
     * --------------------------------------------------------
     */

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />

                    <p className="text-sm text-slate-600">
                        Loading hospital dashboard...
                    </p>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * Not authorized
     * --------------------------------------------------------
     */

    if (!authorized || !membership || !hospital) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-red-500" />
                    </div>

                    <h1 className="mt-5 text-xl font-semibold text-slate-900">
                        No Hospital Assigned
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                        Your account does not currently have a Hospital Admin
                        membership.
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Please contact the Super Admin if you believe this is a mistake.
                    </p>

                    <div className="mt-6 flex gap-3 justify-center">
                        <Link
                            to="/"
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Go Home
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * Dashboard
     * --------------------------------------------------------
     */

    const pendingAppointments = appointments.filter(
        (appointment) => appointment.status === "pending"
    ).length;

    const confirmedAppointments = appointments.filter(
        (appointment) => appointment.status === "confirmed"
    ).length;

    const completedAppointments = appointments.filter(
        (appointment) => appointment.status === "completed"
    ).length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* HEADER */}

            <header className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">
                                    Hospital Admin
                                </p>

                                <h1 className="font-semibold text-slate-900">
                                    {hospital.name}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadHospitalAdmin}
                                className="p-2 rounded-lg border hover:bg-slate-50"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="grid lg:grid-cols-[240px_1fr] gap-6">
                    {/* SIDEBAR */}

                    <aside className="bg-white rounded-2xl border p-3 h-fit">
                        <nav className="space-y-1">
                            <SidebarButton
                                active={activeTab === "overview"}
                                icon={<Building2 className="w-4 h-4" />}
                                label="Overview"
                                onClick={() => setActiveTab("overview")}
                            />

                            <SidebarButton
                                active={activeTab === "hospital"}
                                icon={<Building2 className="w-4 h-4" />}
                                label="Hospital"
                                onClick={() => setActiveTab("hospital")}
                            />

                            <SidebarButton
                                active={activeTab === "doctors"}
                                icon={<Stethoscope className="w-4 h-4" />}
                                label="Doctors"
                                onClick={() => setActiveTab("doctors")}
                            />

                            <SidebarButton
                                active={activeTab === "appointments"}
                                icon={<CalendarDays className="w-4 h-4" />}
                                label="Appointments"
                                onClick={() => setActiveTab("appointments")}
                            />

                            <SidebarButton
                                active={activeTab === "staff"}
                                icon={<Users className="w-4 h-4" />}
                                label="Staff"
                                onClick={() => setActiveTab("staff")}
                            />
                        </nav>
                    </aside>

                    {/* MAIN */}

                    <main>
                        {error && (
                            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {activeTab === "overview" && (
                            <Overview
                                hospital={hospital}
                                doctorsCount={doctors.length}
                                appointmentsCount={appointments.length}
                                pendingAppointments={pendingAppointments}
                                confirmedAppointments={confirmedAppointments}
                                completedAppointments={completedAppointments}
                            />
                        )}

                        {activeTab === "hospital" && (
                            <HospitalInformation hospital={hospital} />
                        )}

                        {activeTab === "doctors" && (
                            <DoctorsSection doctors={doctors} />
                        )}

                        {activeTab === "appointments" && (
                            <AppointmentsSection
                                appointments={appointments}
                                doctors={doctors}
                                onUpdateStatus={updateAppointmentStatus}
                            />
                        )}

                        {activeTab === "staff" && (
                            <StaffSection hospitalId={hospital.id} />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

/* ========================================================
   SIDEBAR BUTTON
======================================================== */

function SidebarButton({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

/* ========================================================
   OVERVIEW
======================================================== */

function Overview({
    hospital,
    doctorsCount,
    appointmentsCount,
    pendingAppointments,
    confirmedAppointments,
    completedAppointments,
}: {
    hospital: Hospital;
    doctorsCount: number;
    appointmentsCount: number;
    pendingAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Hospital Overview
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Manage your hospital from one place.
                </p>
            </div>

            {/* STATS */}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Doctors"
                    value={doctorsCount}
                    icon={<Stethoscope className="w-5 h-5" />}
                />

                <StatCard
                    title="Appointments"
                    value={appointmentsCount}
                    icon={<CalendarDays className="w-5 h-5" />}
                />

                <StatCard
                    title="Pending"
                    value={pendingAppointments}
                    icon={<CalendarDays className="w-5 h-5" />}
                />

                <StatCard
                    title="Confirmed"
                    value={confirmedAppointments}
                    icon={<CalendarDays className="w-5 h-5" />}
                />
            </div>

            {/* HOSPITAL CARD */}

            <div className="bg-white rounded-2xl border overflow-hidden">
                {hospital.image_url && (
                    <img
                        src={hospital.image_url}
                        alt={hospital.name}
                        className="w-full h-52 object-cover"
                    />
                )}

                <div className="p-6">
                    <h3 className="text-xl font-semibold text-slate-900">
                        {hospital.name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                        {hospital.city}
                    </p>

                    <div className="mt-5 grid sm:grid-cols-2 gap-4 text-sm">
                        <InfoItem label="Address" value={hospital.address} />
                        <InfoItem label="Phone" value={hospital.phone} />

                        <InfoItem
                            label="Email"
                            value={hospital.email || "Not available"}
                        />

                        <InfoItem
                            label="Beds"
                            value={
                                hospital.beds !== null
                                    ? hospital.beds.toString()
                                    : "Not specified"
                            }
                        />

                        <InfoItem
                            label="Rating"
                            value={`${hospital.rating} (${hospital.reviews_count} reviews)`}
                        />

                        <InfoItem
                            label="Hours"
                            value={hospital.hours}
                        />
                    </div>

                    <div className="mt-6">
                        <p className="text-sm font-medium text-slate-700">
                            About
                        </p>

                        <p className="mt-2 text-sm text-slate-600 leading-6">
                            {hospital.about || "No description available."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================================
   STAT CARD
======================================================== */

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-white border rounded-2xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                {icon}
            </div>

            <p className="text-sm text-slate-500 mt-4">
                {title}
            </p>

            <p className="text-2xl font-bold text-slate-900 mt-1">
                {value}
            </p>
        </div>
    );
}

/* ========================================================
   HOSPITAL INFORMATION
======================================================== */

function HospitalInformation({
    hospital,
}: {
    hospital: Hospital;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Hospital Information
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Information for your hospital.
                </p>
            </div>

            <div className="bg-white border rounded-2xl p-6">
                <div className="grid md:grid-cols-2 gap-5">
                    <InfoItem label="Hospital Name" value={hospital.name} />
                    <InfoItem label="City" value={hospital.city} />
                    <InfoItem label="Address" value={hospital.address} />
                    <InfoItem label="Phone" value={hospital.phone} />
                    <InfoItem
                        label="Email"
                        value={hospital.email || "Not available"}
                    />
                    <InfoItem label="Opening Hours" value={hospital.hours} />
                    <InfoItem
                        label="Emergency"
                        value={hospital.emergency ? "Available" : "Not available"}
                    />
                    <InfoItem
                        label="Beds"
                        value={
                            hospital.beds !== null
                                ? hospital.beds.toString()
                                : "Not specified"
                        }
                    />
                </div>
            </div>
        </div>
    );
}

/* ========================================================
   DOCTORS
======================================================== */

function DoctorsSection({
    doctors,
}: {
    doctors: Doctor[];
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Doctors
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                        Doctors registered under your hospital.
                    </p>
                </div>

                <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {doctors.length} doctors
                </span>
            </div>

            {doctors.length === 0 ? (
                <EmptyState
                    icon={<Stethoscope className="w-7 h-7" />}
                    title="No doctors found"
                    description="There are currently no doctors assigned to this hospital."
                />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {doctors.map((doctor) => (
                        <div
                            key={doctor.id}
                            className="bg-white border rounded-2xl p-5"
                        >
                            <div className="flex gap-4">
                                {doctor.photo_url ? (
                                    <img
                                        src={doctor.photo_url}
                                        alt={doctor.name}
                                        className="w-16 h-16 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Stethoscope className="w-7 h-7" />
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-900">
                                        {doctor.name}
                                    </h3>

                                    <p className="text-sm text-slate-500 mt-1">
                                        {doctor.qualification}
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {doctor.experience_years} years experience
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-slate-400">
                                        Consultation Fee
                                    </p>

                                    <p className="font-medium text-slate-800">
                                        ₹{doctor.fee}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-slate-400">
                                        Gender
                                    </p>

                                    <p className="font-medium text-slate-800">
                                        {doctor.gender}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ========================================================
   APPOINTMENTS
======================================================== */

function AppointmentsSection({
    appointments,
    doctors,
    onUpdateStatus,
}: {
    appointments: Appointment[];
    doctors: Doctor[];
    onUpdateStatus: (
        appointmentId: string,
        status: "pending" | "confirmed" | "completed" | "cancelled"
    ) => void;
}) {
    function doctorName(doctorId: string) {
        return (
            doctors.find((doctor) => doctor.id === doctorId)?.name ||
            "Unknown doctor"
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Appointments
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Appointments for your hospital.
                </p>
            </div>

            {appointments.length === 0 ? (
                <EmptyState
                    icon={<CalendarDays className="w-7 h-7" />}
                    title="No appointments"
                    description="There are currently no appointments for this hospital."
                />
            ) : (
                <div className="space-y-3">
                    {appointments.map((appointment) => (
                        <div
                            key={appointment.id}
                            className="bg-white border rounded-2xl p-5"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">
                                            {appointment.patient_name}
                                        </h3>

                                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                            {appointment.booking_ref}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-500 mt-1">
                                        Dr. {doctorName(appointment.doctor_id)}
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {appointment.appointment_date} •{" "}
                                        {appointment.appointment_time}
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {appointment.patient_phone}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${appointment.status === "confirmed"
                                                ? "bg-green-50 text-green-700"
                                                : appointment.status === "completed"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : appointment.status === "cancelled"
                                                        ? "bg-red-50 text-red-700"
                                                        : "bg-yellow-50 text-yellow-700"
                                            }`}
                                    >
                                        {appointment.status}
                                    </span>

                                    <select
                                        value={appointment.status}
                                        onChange={(event) =>
                                            onUpdateStatus(
                                                appointment.id,
                                                event.target.value as
                                                | "pending"
                                                | "confirmed"
                                                | "completed"
                                                | "cancelled"
                                            )
                                        }
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="confirmed">
                                            Confirmed
                                        </option>

                                        <option value="completed">
                                            Completed
                                        </option>

                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ========================================================
   STAFF
======================================================== */

function StaffSection({
    hospitalId,
}: {
    hospitalId: string;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Hospital Staff
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Staff management will be enabled in the next step.
                </p>
            </div>

            <div className="bg-white border rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Staff management
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                            Staff invitations and doctor assistants will be
                            configured in the upcoming role-management step.
                        </p>

                        <p className="text-xs text-slate-400 mt-2">
                            Hospital ID: {hospitalId}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================================
   SMALL COMPONENTS
======================================================== */

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
                {label}
            </p>

            <p className="text-sm text-slate-800 mt-1">
                {value}
            </p>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="bg-white border rounded-2xl p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                {icon}
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}