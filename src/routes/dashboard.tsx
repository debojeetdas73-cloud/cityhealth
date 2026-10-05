import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
    CalendarDays,
    FileText,
    Heart,
    LogOut,
    Package,
    UserRound,
    Users,
    CreditCard,
    Pencil,
    Stethoscope,
    Building2,
    Plus,
    Trash2,
    X,
    LayoutDashboard,
    Menu,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

import {
    getProfile,
    updateProfile,
    listAppointments,
    listFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    listHealthRecords,
    listPackageBookings,
    listPayments,
    getActiveSubscription,
} from "@/lib/data";

import type {
    Profile,
    Appointment,
    FamilyMember,
    HealthRecord,
    PackageBooking,
    Payment,
    Subscription,
} from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
    component: DashboardPage,
});

type ActiveSection =
    | "overview"
    | "personal"
    | "appointments"
    | "family"
    | "records"
    | "packages"
    | "membership"
    | "payments";

function DashboardPage() {
    const { user, loading, signOut } = useAuth();

    const userId = user?.id ?? "";

    const [activeSection, setActiveSection] =
        useState<ActiveSection>("overview");

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
    const [packageBookings, setPackageBookings] = useState<PackageBooking[]>(
        [],
    );
    const [payments, setPayments] = useState<Payment[]>([]);
    const [subscription, setSubscription] =
        useState<Subscription | null>(null);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [familyDialog, setFamilyDialog] = useState(false);
    const [editingFamilyId, setEditingFamilyId] = useState<string | null>(
        null,
    );

    const [familyForm, setFamilyForm] = useState({
        full_name: "",
        relation: "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
        phone: "",
    });

    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
        city: "",
    });

    /*
     * Load account data
     */
    useEffect(() => {
        if (!userId) return;

        async function loadAccount() {
            try {
                const [
                    profileData,
                    appointmentData,
                    familyData,
                    recordData,
                    packageData,
                    paymentData,
                    subscriptionData,
                ] = await Promise.all([
                    getProfile(userId),
                    listAppointments(userId),
                    listFamilyMembers(userId),
                    listHealthRecords(userId),
                    listPackageBookings(userId),
                    listPayments(userId),
                    getActiveSubscription(userId),
                ]);

                setProfile(profileData);
                setAppointments(appointmentData);
                setFamilyMembers(familyData);
                setHealthRecords(recordData);
                setPackageBookings(packageData);
                setPayments(paymentData);
                setSubscription(subscriptionData);

                if (profileData) {
                    setForm({
                        full_name: profileData.full_name ?? "",
                        phone: profileData.phone ?? "",
                        date_of_birth: profileData.date_of_birth ?? "",
                        gender: profileData.gender ?? "",
                        blood_group: profileData.blood_group ?? "",
                        city: profileData.city ?? "",
                    });
                }
            } catch (error) {
                console.error("Failed to load account:", error);

                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Could not load your account.",
                );
            }
        }

        loadAccount();
    }, [userId]);

    /*
     * Loading state
     */
    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-muted-foreground">
                    Loading your account...
                </p>
            </div>
        );
    }

    /*
     * Not logged in
     */
    if (!user) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <UserRound className="mb-4 size-12 text-muted-foreground" />

                <h1 className="font-display text-2xl font-bold text-navy">
                    Sign in to view your account
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Manage appointments, health records and your profile.
                </p>

                <Button asChild className="mt-6">
                    <Link to="/auth">Sign in</Link>
                </Button>
            </div>
        );
    }

    /*
     * Change section
     */
    function changeSection(section: ActiveSection) {
        setActiveSection(section);
        setMobileMenuOpen(false);
        setEditing(false);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    /*
     * Save profile
     */
    async function saveProfile() {
        if (!userId) {
            toast.error("You must be signed in.");
            return;
        }

        try {
            setSaving(true);

            await updateProfile(userId, {
                full_name: form.full_name,
                phone: form.phone || null,
                date_of_birth: form.date_of_birth || null,
                gender: form.gender || null,
                blood_group: form.blood_group || null,
                city: form.city || null,
            });

            const updated = await getProfile(userId);

            setProfile(updated);
            setEditing(false);

            toast.success("Profile updated successfully.");
        } catch (error) {
            console.error("Failed to update profile:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not update your profile.",
            );
        } finally {
            setSaving(false);
        }
    }

    /*
     * Family form
     */
    function resetFamilyForm() {
        setFamilyForm({
            full_name: "",
            relation: "",
            date_of_birth: "",
            gender: "",
            blood_group: "",
            phone: "",
        });

        setEditingFamilyId(null);
    }

    function openAddFamilyMember() {
        resetFamilyForm();
        setFamilyDialog(true);
    }

    function openEditFamilyMember(member: FamilyMember) {
        setEditingFamilyId(member.id);

        setFamilyForm({
            full_name: member.full_name ?? "",
            relation: member.relation ?? "",
            date_of_birth: member.date_of_birth ?? "",
            gender: member.gender ?? "",
            blood_group: member.blood_group ?? "",
            phone: member.phone ?? "",
        });

        setFamilyDialog(true);
    }

    /*
     * Save family member
     */
    async function saveFamilyMember() {
        if (!userId) {
            toast.error("You must be signed in.");
            return;
        }

        if (!familyForm.full_name.trim()) {
            toast.error("Please enter the family member's name.");
            return;
        }

        if (!familyForm.relation.trim()) {
            toast.error("Please enter the relation.");
            return;
        }

        try {
            setSaving(true);

            if (editingFamilyId) {
                await updateFamilyMember(editingFamilyId, {
                    full_name: familyForm.full_name.trim(),
                    relation: familyForm.relation.trim(),
                    date_of_birth: familyForm.date_of_birth || null,
                    gender: familyForm.gender || null,
                    blood_group: familyForm.blood_group || null,
                    phone: familyForm.phone || null,
                });

                toast.success("Family member updated.");
            } else {
                await addFamilyMember({
                    user_id: userId,
                    full_name: familyForm.full_name.trim(),
                    relation: familyForm.relation.trim(),
                    date_of_birth: familyForm.date_of_birth || null,
                    gender: familyForm.gender || null,
                    blood_group: familyForm.blood_group || null,
                    phone: familyForm.phone || null,
                });

                toast.success("Family member added.");
            }

            const updatedFamilyMembers =
                await listFamilyMembers(userId);

            setFamilyMembers(updatedFamilyMembers);

            setFamilyDialog(false);

            resetFamilyForm();
        } catch (error) {
            console.error("Failed to save family member:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save family member.",
            );
        } finally {
            setSaving(false);
        }
    }

    /*
     * Delete family member
     */
    async function handleDeleteFamilyMember(memberId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to remove this family member?",
        );

        if (!confirmed) return;

        try {
            await deleteFamilyMember(memberId);

            setFamilyMembers((members) =>
                members.filter((member) => member.id !== memberId),
            );

            toast.success("Family member removed.");
        } catch (error) {
            console.error("Failed to delete family member:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not delete family member.",
            );
        }
    }

    /*
     * Logout
     */
    async function handleLogout() {
        try {
            await signOut();
            window.location.href = "/";
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Could not sign out.");
        }
    }

    const upcomingAppointments = appointments.filter(
        (appointment) =>
            appointment.status === "pending" ||
            appointment.status === "confirmed",
    );

    const sidebarItems: {
        id: ActiveSection;
        label: string;
        icon: React.ReactNode;
    }[] = [
            {
                id: "overview",
                label: "Overview",
                icon: <LayoutDashboard className="size-5" />,
            },
            {
                id: "personal",
                label: "Personal Information",
                icon: <UserRound className="size-5" />,
            },
            {
                id: "appointments",
                label: "Appointments",
                icon: <CalendarDays className="size-5" />,
            },
            {
                id: "family",
                label: "Family Members",
                icon: <Users className="size-5" />,
            },
            {
                id: "records",
                label: "Health Records",
                icon: <FileText className="size-5" />,
            },
            {
                id: "packages",
                label: "Package Bookings",
                icon: <Package className="size-5" />,
            },
            {
                id: "membership",
                label: "Membership",
                icon: <Heart className="size-5" />,
            },
            {
                id: "payments",
                label: "Payments",
                icon: <CreditCard className="size-5" />,
            },
        ];

    const activeItem = sidebarItems.find(
        (item) => item.id === activeSection,
    );

    return (
        <div className="min-h-screen bg-muted/40">
            {/* Mobile Header */}
            <div className="sticky top-0 z-40 border-b bg-background lg:hidden">
                <div className="flex items-center justify-between px-4 py-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            My Account
                        </p>

                        <p className="font-display text-lg font-bold text-navy">
                            {activeItem?.label}
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                            setMobileMenuOpen(!mobileMenuOpen)
                        }
                    >
                        {mobileMenuOpen ? (
                            <X className="size-5" />
                        ) : (
                            <Menu className="size-5" />
                        )}
                    </Button>
                </div>

                {mobileMenuOpen && (
                    <div className="border-t bg-background p-3">
                        <SidebarContent
                            items={sidebarItems}
                            activeSection={activeSection}
                            onChange={changeSection}
                            onLogout={handleLogout}
                        />
                    </div>
                )}
            </div>

            <div className="mx-auto flex min-h-screen max-w-7xl">
                {/* Desktop Sidebar */}
                <aside className="hidden w-72 shrink-0 border-r bg-background lg:block">
                    <div className="sticky top-0 flex h-screen flex-col">
                        {/* Sidebar Header */}
                        <div className="border-b px-6 py-6">
                            <div className="flex items-center gap-3">
                                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <UserRound className="size-6" />
                                </div>

                                <div className="min-w-0">
                                    <p className="font-display font-bold text-navy">
                                        My Account
                                    </p>

                                    <p className="truncate text-xs text-muted-foreground">
                                        {profile?.full_name ||
                                            user.email ||
                                            "User"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Account
                            </p>

                            <SidebarContent
                                items={sidebarItems}
                                activeSection={activeSection}
                                onChange={changeSection}
                                onLogout={handleLogout}
                            />
                        </div>

                        {/* Sidebar Footer */}
                        <div className="border-t p-4">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-3 size-4" />
                                Sign out
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="min-w-0 flex-1">
                    {/* Desktop Page Header */}
                    <div className="hidden border-b bg-background lg:block">
                        <div className="px-8 py-7">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>My Account</span>
                                <ChevronRight className="size-4" />
                                <span className="font-medium text-foreground">
                                    {activeItem?.label}
                                </span>
                            </div>

                            <h1 className="mt-2 font-display text-3xl font-bold text-navy">
                                {activeItem?.label}
                            </h1>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {getSectionDescription(activeSection)}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 lg:p-8">
                        {/* OVERVIEW */}
                        {activeSection === "overview" && (
                            <OverviewSection
                                profile={profile}
                                appointments={appointments}
                                familyMembers={familyMembers}
                                healthRecords={healthRecords}
                                packageBookings={packageBookings}
                                onChangeSection={changeSection}
                            />
                        )}

                        {/* PERSONAL INFORMATION */}
                        {activeSection === "personal" && (
                            <PersonalSection
                                profile={profile}
                                userEmail={user.email ?? ""}
                                editing={editing}
                                saving={saving}
                                form={form}
                                setForm={setForm}
                                setEditing={setEditing}
                                saveProfile={saveProfile}
                            />
                        )}

                        {/* APPOINTMENTS */}
                        {activeSection === "appointments" && (
                            <AppointmentsSection
                                appointments={appointments}
                                upcomingAppointments={
                                    upcomingAppointments
                                }
                            />
                        )}

                        {/* FAMILY */}
                        {activeSection === "family" && (
                            <FamilySection
                                familyMembers={familyMembers}
                                openAddFamilyMember={
                                    openAddFamilyMember
                                }
                                openEditFamilyMember={
                                    openEditFamilyMember
                                }
                                handleDeleteFamilyMember={
                                    handleDeleteFamilyMember
                                }
                            />
                        )}

                        {/* RECORDS */}
                        {activeSection === "records" && (
                            <HealthRecordsSection
                                healthRecords={healthRecords}
                            />
                        )}

                        {/* PACKAGES */}
                        {activeSection === "packages" && (
                            <PackageBookingsSection
                                packageBookings={packageBookings}
                            />
                        )}

                        {/* MEMBERSHIP */}
                        {activeSection === "membership" && (
                            <MembershipSection
                                subscription={subscription}
                            />
                        )}

                        {/* PAYMENTS */}
                        {activeSection === "payments" && (
                            <PaymentsSection payments={payments} />
                        )}
                    </div>
                </main>
            </div>

            {/* Family Modal */}
            {familyDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-display text-xl font-bold text-navy">
                                    {editingFamilyId
                                        ? "Edit Family Member"
                                        : "Add Family Member"}
                                </h3>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Add basic information for this family
                                    member.
                                </p>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setFamilyDialog(false);
                                    resetFamilyForm();
                                }}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <ProfileField
                                label="Full name *"
                                value={familyForm.full_name}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        full_name: value,
                                    })
                                }
                            />

                            <ProfileField
                                label="Relation *"
                                value={familyForm.relation}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        relation: value,
                                    })
                                }
                            />

                            <ProfileField
                                label="Date of birth"
                                type="date"
                                value={familyForm.date_of_birth}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        date_of_birth: value,
                                    })
                                }
                            />

                            <ProfileField
                                label="Gender"
                                value={familyForm.gender}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        gender: value,
                                    })
                                }
                            />

                            <ProfileField
                                label="Blood group"
                                value={familyForm.blood_group}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        blood_group: value,
                                    })
                                }
                            />

                            <ProfileField
                                label="Phone"
                                value={familyForm.phone}
                                onChange={(value) =>
                                    setFamilyForm({
                                        ...familyForm,
                                        phone: value,
                                    })
                                }
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFamilyDialog(false);
                                    resetFamilyForm();
                                }}
                                disabled={saving}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={saveFamilyMember}
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : editingFamilyId
                                        ? "Update"
                                        : "Add Family Member"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================
   SIDEBAR
============================================================ */

function SidebarContent({
    items,
    activeSection,
    onChange,
    onLogout,
}: {
    items: {
        id: ActiveSection;
        label: string;
        icon: React.ReactNode;
    }[];
    activeSection: ActiveSection;
    onChange: (section: ActiveSection) => void;
    onLogout: () => void;
}) {
    return (
        <nav className="space-y-1">
            {items.map((item) => {
                const active = activeSection === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange(item.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                    >
                        {item.icon}

                        <span className="flex-1">
                            {item.label}
                        </span>

                        {active && (
                            <ChevronRight className="size-4" />
                        )}
                    </button>
                );
            })}

            {/* Mobile logout */}
            <button
                type="button"
                onClick={onLogout}
                className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 lg:hidden"
            >
                <LogOut className="size-5" />
                Sign out
            </button>
        </nav>
    );
}

/* ============================================================
   OVERVIEW
============================================================ */

function OverviewSection({
    profile,
    appointments,
    familyMembers,
    healthRecords,
    packageBookings,
    onChangeSection,
}: {
    profile: Profile | null;
    appointments: Appointment[];
    familyMembers: FamilyMember[];
    healthRecords: HealthRecord[];
    packageBookings: PackageBooking[];
    onChangeSection: (section: ActiveSection) => void;
}) {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-card">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserRound className="size-8" />
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Welcome back
                        </p>

                        <h2 className="mt-1 font-display text-2xl font-bold text-navy">
                            {profile?.full_name || "User"}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage all your healthcare information from here.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={<CalendarDays className="size-5" />}
                    title="Appointments"
                    value={appointments.length}
                    onClick={() =>
                        onChangeSection("appointments")
                    }
                />

                <StatCard
                    icon={<Users className="size-5" />}
                    title="Family Members"
                    value={familyMembers.length}
                    onClick={() => onChangeSection("family")}
                />

                <StatCard
                    icon={<FileText className="size-5" />}
                    title="Health Records"
                    value={healthRecords.length}
                    onClick={() => onChangeSection("records")}
                />

                <StatCard
                    icon={<Package className="size-5" />}
                    title="Package Bookings"
                    value={packageBookings.length}
                    onClick={() => onChangeSection("packages")}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <DashboardActionCard
                    icon={<UserRound />}
                    title="Personal Information"
                    description="Update your name, phone, blood group and other details."
                    onClick={() => onChangeSection("personal")}
                />

                <DashboardActionCard
                    icon={<CreditCard />}
                    title="Payment History"
                    description="View your previous healthcare payments."
                    onClick={() => onChangeSection("payments")}
                />

                <DashboardActionCard
                    icon={<Heart />}
                    title="Membership"
                    description="View your current cityhealth membership."
                    onClick={() => onChangeSection("membership")}
                />

                <DashboardActionCard
                    icon={<Users />}
                    title="Family Members"
                    description="Manage healthcare information for your family."
                    onClick={() => onChangeSection("family")}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    to="/hospitals"
                    className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                        <Building2 className="size-6" />
                    </div>

                    <div>
                        <p className="font-semibold text-navy">
                            Find a Hospital
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Browse hospitals and healthcare facilities.
                        </p>
                    </div>

                    <ChevronRight className="ml-auto size-5 text-muted-foreground" />
                </Link>

                <Link
                    to="/health-packages"
                    className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                        <Package className="size-6" />
                    </div>

                    <div>
                        <p className="font-semibold text-navy">
                            Health Packages
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Browse available health checkup packages.
                        </p>
                    </div>

                    <ChevronRight className="ml-auto size-5 text-muted-foreground" />
                </Link>
            </div>
        </div>
    );
}

/* ============================================================
   PERSONAL INFORMATION
============================================================ */

function PersonalSection({
    profile,
    userEmail,
    editing,
    saving,
    form,
    setForm,
    setEditing,
    saveProfile,
}: {
    profile: Profile | null;
    userEmail: string;
    editing: boolean;
    saving: boolean;
    form: {
        full_name: string;
        phone: string;
        date_of_birth: string;
        gender: string;
        blood_group: string;
        city: string;
    };
    setForm: React.Dispatch<
        React.SetStateAction<{
            full_name: string;
            phone: string;
            date_of_birth: string;
            gender: string;
            blood_group: string;
            city: string;
        }>
    >;
    setEditing: (value: boolean) => void;
    saveProfile: () => void;
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="font-display text-xl font-bold text-navy">
                        Personal Information
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Keep your healthcare information up to date.
                    </p>
                </div>

                {!editing && (
                    <Button
                        variant="outline"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="mr-2 size-4" />
                        Edit Information
                    </Button>
                )}
            </div>

            {editing ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <ProfileField
                        label="Full name"
                        value={form.full_name}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                full_name: value,
                            })
                        }
                    />

                    <ProfileField
                        label="Phone"
                        value={form.phone}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                phone: value,
                            })
                        }
                    />

                    <ProfileField
                        label="Date of birth"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                date_of_birth: value,
                            })
                        }
                    />

                    <ProfileField
                        label="Gender"
                        value={form.gender}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                gender: value,
                            })
                        }
                    />

                    <ProfileField
                        label="Blood group"
                        value={form.blood_group}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                blood_group: value,
                            })
                        }
                    />

                    <ProfileField
                        label="City"
                        value={form.city}
                        onChange={(value) =>
                            setForm({
                                ...form,
                                city: value,
                            })
                        }
                    />

                    <div className="flex gap-2 sm:col-span-2">
                        <Button
                            onClick={saveProfile}
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setEditing(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <Info
                        label="Email"
                        value={profile?.email || userEmail || "—"}
                    />

                    <Info
                        label="Full name"
                        value={profile?.full_name || "Not added"}
                    />

                    <Info
                        label="Phone"
                        value={profile?.phone || "Not added"}
                    />

                    <Info
                        label="Date of birth"
                        value={
                            profile?.date_of_birth || "Not added"
                        }
                    />

                    <Info
                        label="Gender"
                        value={profile?.gender || "Not added"}
                    />

                    <Info
                        label="Blood group"
                        value={
                            profile?.blood_group || "Not added"
                        }
                    />

                    <Info
                        label="City"
                        value={profile?.city || "Not added"}
                    />
                </div>
            )}
        </section>
    );
}

/* ============================================================
   APPOINTMENTS
============================================================ */

type AppointmentFilter = "upcoming" | "completed" | "cancelled" | "all";

function AppointmentsSection({
    appointments,
    upcomingAppointments,
}: {
    appointments: Appointment[];
    upcomingAppointments: Appointment[];
}) {
    const [filter, setFilter] = useState<AppointmentFilter>("upcoming");

    const completedAppointments = appointments.filter(
        (appointment) =>
            String(appointment.status).toLowerCase() === "completed",
    );

    const cancelledAppointments = appointments.filter((appointment) => {
        const status = String(appointment.status).toLowerCase();
        return status === "cancelled" || status === "canceled" || status === "rejected";
    });

    const filteredAppointments =
        filter === "upcoming"
            ? upcomingAppointments
            : filter === "completed"
                ? completedAppointments
                : filter === "cancelled"
                    ? cancelledAppointments
                    : appointments;

    const tabs: { id: AppointmentFilter; label: string; count: number }[] = [
        {
            id: "upcoming",
            label: "Upcoming",
            count: upcomingAppointments.length,
        },
        {
            id: "completed",
            label: "Completed",
            count: completedAppointments.length,
        },
        {
            id: "cancelled",
            label: "Cancelled",
            count: cancelledAppointments.length,
        },
        {
            id: "all",
            label: "All",
            count: appointments.length,
        },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-card">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <SectionHeader
                        icon={<CalendarDays />}
                        title="My Appointments"
                        description="View and manage your doctor appointments."
                    />

                    <Button asChild className="w-full sm:w-auto">
                        <Link to="/search">
                            <Stethoscope className="mr-2 size-4" />
                            Find a Doctor
                        </Link>
                    </Button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id)}
                            className={`rounded-xl border p-4 text-left transition ${filter === tab.id
                                    ? "border-primary bg-primary/10 shadow-sm"
                                    : "bg-background hover:bg-muted/50"
                                }`}
                        >
                            <p className="text-sm text-muted-foreground">
                                {tab.label}
                            </p>
                            <p className="mt-1 font-display text-2xl font-bold text-navy">
                                {tab.count}
                            </p>
                        </button>
                    ))}
                </div>

                {filteredAppointments.length === 0 ? (
                    <AppointmentEmptyState filter={filter} />
                ) : (
                    <div className="mt-6 space-y-4">
                        {filteredAppointments.map((appointment) => (
                            <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-2xl border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-bold text-navy">
                    Appointment Summary
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniStat
                        title="Total"
                        value={appointments.length}
                    />

                    <MiniStat
                        title="Upcoming"
                        value={upcomingAppointments.length}
                    />

                    <MiniStat
                        title="Completed"
                        value={completedAppointments.length}
                    />

                    <MiniStat
                        title="Cancelled"
                        value={cancelledAppointments.length}
                    />
                </div>
            </section>
        </div>
    );
}

function AppointmentEmptyState({
    filter,
}: {
    filter: AppointmentFilter;
}) {
    const messages: Record<AppointmentFilter, string> = {
        upcoming: "You don't have any upcoming appointments.",
        completed: "You don't have any completed appointments yet.",
        cancelled: "You don't have any cancelled appointments.",
        all: "You don't have any appointments yet.",
    };

    return (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="size-7" />
            </div>

            <p className="mt-4 font-semibold text-navy">
                {messages[filter]}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
                {filter === "upcoming" || filter === "all"
                    ? "Find a doctor and book an appointment when you need one."
                    : "Your appointment history will appear here."}
            </p>

            {(filter === "upcoming" || filter === "all") && (
                <Button asChild variant="outline" className="mt-5">
                    <Link to="/search">
                        <Stethoscope className="mr-2 size-4" />
                        Find a Doctor
                    </Link>
                </Button>
            )}
        </div>
    );
}

function AppointmentCard({
    appointment,
}: {
    appointment: Appointment;
}) {
    const status = String(appointment.status).toLowerCase();

    const statusClass =
        status === "completed"
            ? "border-green-200 bg-green-50 text-green-700"
            : status === "cancelled" ||
                status === "canceled" ||
                status === "rejected"
                ? "border-red-200 bg-red-50 text-red-700"
                : status === "confirmed"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700";

    return (
        <div className="rounded-xl border bg-background p-5 transition hover:shadow-md">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Stethoscope className="size-5" />
                        </div>

                        <div className="min-w-0">
                            <p className="font-display text-lg font-bold text-navy">
                                {appointment.doctor?.name || "Doctor"}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {appointment.doctor?.specialty?.name ||
                                    "Medical consultation"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <AppointmentInfo
                            label="Date"
                            value={appointment.appointment_date || "Not specified"}
                        />
                        <AppointmentInfo
                            label="Time"
                            value={appointment.appointment_time || "Not specified"}
                        />
                        <AppointmentInfo
                            label="Hospital"
                            value={appointment.hospital?.name || "Hospital"}
                        />
                        <AppointmentInfo
                            label="Status"
                            value={String(appointment.status || "pending")}
                        />
                    </div>
                </div>

                <Badge
                    variant="outline"
                    className={`w-fit capitalize ${statusClass}`}
                >
                    {String(appointment.status || "pending")}
                </Badge>
            </div>
        </div>
    );
}

function AppointmentInfo({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-sm font-medium text-navy">
                {value}
            </p>
        </div>
    );
}

/* ============================================================
   FAMILY
============================================================ */

function FamilySection({
    familyMembers,
    openAddFamilyMember,
    openEditFamilyMember,
    handleDeleteFamilyMember,
}: {
    familyMembers: FamilyMember[];
    openAddFamilyMember: () => void;
    openEditFamilyMember: (member: FamilyMember) => void;
    handleDeleteFamilyMember: (id: string) => void;
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <SectionHeader
                    icon={<Users />}
                    title="Family Members"
                    description="People you manage healthcare for."
                />

                <Button onClick={openAddFamilyMember}>
                    <Plus className="mr-2 size-4" />
                    Add Family Member
                </Button>
            </div>

            {familyMembers.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
                    <Users className="mx-auto size-10 text-muted-foreground" />

                    <p className="mt-4 font-semibold text-navy">
                        No family members added
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Add family members to manage their healthcare.
                    </p>

                    <Button
                        className="mt-5"
                        variant="outline"
                        onClick={openAddFamilyMember}
                    >
                        <Plus className="mr-2 size-4" />
                        Add Family Member
                    </Button>
                </div>
            ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {familyMembers.map((member) => (
                        <div
                            key={member.id}
                            className="rounded-xl border p-5"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-navy">
                                        {member.full_name}
                                    </p>

                                    <p className="text-sm text-muted-foreground">
                                        {member.relation}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <Users className="size-4" />
                                </div>
                            </div>

                            <div className="mt-5 space-y-2 text-sm">
                                {member.date_of_birth && (
                                    <Info
                                        label="Date of birth"
                                        value={
                                            member.date_of_birth
                                        }
                                    />
                                )}

                                {member.gender && (
                                    <Info
                                        label="Gender"
                                        value={member.gender}
                                    />
                                )}

                                {member.blood_group && (
                                    <Info
                                        label="Blood group"
                                        value={
                                            member.blood_group
                                        }
                                    />
                                )}

                                {member.phone && (
                                    <Info
                                        label="Phone"
                                        value={member.phone}
                                    />
                                )}
                            </div>

                            <div className="mt-5 flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        openEditFamilyMember(member)
                                    }
                                >
                                    <Pencil className="mr-1.5 size-3.5" />
                                    Edit
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                        handleDeleteFamilyMember(
                                            member.id,
                                        )
                                    }
                                >
                                    <Trash2 className="mr-1.5 size-3.5" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ============================================================
   HEALTH RECORDS
============================================================ */

function HealthRecordsSection({
    healthRecords,
}: {
    healthRecords: HealthRecord[];
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <SectionHeader
                icon={<FileText />}
                title="Health Records"
                description="View your stored medical records."
            />

            {healthRecords.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
                    <FileText className="mx-auto size-10 text-muted-foreground" />

                    <p className="mt-4 font-semibold text-navy">
                        No health records
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Your medical records will appear here.
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {healthRecords.map((record) => (
                        <div
                            key={record.id}
                            className="rounded-xl border p-5"
                        >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row">
                                <div>
                                    <p className="font-semibold text-navy">
                                        {record.title}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {record.record_type}
                                    </p>

                                    {record.notes && (
                                        <p className="mt-3 text-sm">
                                            {record.notes}
                                        </p>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground">
                                    {record.record_date}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ============================================================
   PACKAGE BOOKINGS
============================================================ */

function PackageBookingsSection({
    packageBookings,
}: {
    packageBookings: PackageBooking[];
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <SectionHeader
                icon={<Package />}
                title="Health Package Bookings"
                description="View your booked health checkup packages."
            />

            {packageBookings.length === 0 ? (
                <EmptyState
                    text="You haven't booked a health package yet."
                    href="/health-packages"
                    button="Browse Health Packages"
                />
            ) : (
                <div className="mt-6 space-y-4">
                    {packageBookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="rounded-xl border p-5"
                        >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row">
                                <div>
                                    <p className="font-semibold text-navy">
                                        {booking.health_package?.name ||
                                            "Health package"}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {booking.hospital?.name ||
                                            "Hospital"}
                                    </p>

                                    <p className="mt-3 text-sm">
                                        {booking.booking_date} ·{" "}
                                        {booking.booking_time}
                                    </p>
                                </div>

                                <Badge>{booking.status}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ============================================================
   MEMBERSHIP
============================================================ */

function MembershipSection({
    subscription,
}: {
    subscription: Subscription | null;
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <SectionHeader
                icon={<Heart />}
                title="Membership"
                description="Manage your cityhealth membership."
            />

            {subscription ? (
                <div className="mt-6 rounded-xl border p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Current plan
                            </p>

                            <p className="mt-1 font-display text-2xl font-bold text-navy">
                                {subscription.plan?.name ||
                                    "Active Membership"}
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Active until{" "}
                                {subscription.expires_at}
                            </p>
                        </div>

                        <Badge className="w-fit">
                            Active
                        </Badge>
                    </div>
                </div>
            ) : (
                <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
                    <Heart className="mx-auto size-10 text-muted-foreground" />

                    <p className="mt-4 font-semibold text-navy">
                        No active membership
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Get discounts and additional healthcare benefits.
                    </p>

                    <Button asChild className="mt-5">
                        <Link to="/subscriptions">
                            View Plans
                        </Link>
                    </Button>
                </div>
            )}
        </section>
    );
}

/* ============================================================
   PAYMENTS
============================================================ */

function PaymentsSection({
    payments,
}: {
    payments: Payment[];
}) {
    return (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
            <SectionHeader
                icon={<CreditCard />}
                title="Payment History"
                description="View your recent healthcare transactions."
            />

            {payments.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
                    <CreditCard className="mx-auto size-10 text-muted-foreground" />

                    <p className="mt-4 font-semibold text-navy">
                        No payments found
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Your payment history will appear here.
                    </p>
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3">
                                    Type
                                </th>

                                <th className="px-4 py-3">
                                    Amount
                                </th>

                                <th className="px-4 py-3">
                                    Method
                                </th>

                                <th className="px-4 py-3">
                                    Status
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {payments.map((payment) => (
                                <tr
                                    key={payment.id}
                                    className="border-t"
                                >
                                    <td className="px-4 py-4">
                                        {payment.payment_type}
                                    </td>

                                    <td className="px-4 py-4 font-medium">
                                        ₹{payment.amount}
                                    </td>

                                    <td className="px-4 py-4">
                                        {payment.payment_method}
                                    </td>

                                    <td className="px-4 py-4">
                                        <Badge variant="outline">
                                            {
                                                payment.payment_status
                                            }
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

/* ============================================================
   SHARED COMPONENTS
============================================================ */

function getSectionDescription(
    section: ActiveSection,
): string {
    switch (section) {
        case "overview":
            return "A summary of your healthcare activity.";

        case "personal":
            return "Manage your personal and healthcare information.";

        case "appointments":
            return "View and manage your doctor appointments.";

        case "family":
            return "Manage healthcare information for your family members.";

        case "records":
            return "View your stored medical records.";

        case "packages":
            return "View your health package bookings.";

        case "membership":
            return "View your cityhealth membership.";

        case "payments":
            return "View your payment history.";

        default:
            return "Manage your healthcare account.";
    }
}

function SectionHeader({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
                {icon}
            </div>

            <div>
                <h2 className="font-display text-xl font-bold text-navy">
                    {title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    title,
    value,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
        >
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {icon}
                </div>

                <div>
                    <p className="text-sm text-muted-foreground">
                        {title}
                    </p>

                    <p className="font-display text-2xl font-bold text-navy">
                        {value}
                    </p>
                </div>
            </div>
        </button>
    );
}

function DashboardActionCard({
    icon,
    title,
    description,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-4 rounded-xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
        >
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy">
                    {title}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>

            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
    );
}

function MiniStat({
    title,
    value,
}: {
    title: string;
    value: number;
}) {
    return (
        <div className="rounded-xl bg-muted/50 p-5">
            <p className="text-sm text-muted-foreground">
                {title}
            </p>

            <p className="mt-1 font-display text-2xl font-bold text-navy">
                {value}
            </p>
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-navy">
                {value}
            </p>
        </div>
    );
}

function ProfileField({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            <Input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
            />
        </div>
    );
}

function EmptyState({
    text,
    href,
    button,
}: {
    text: string;
    href: string;
    button: string;
}) {
    return (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
                {text}
            </p>

            <Button
                asChild
                variant="outline"
                className="mt-4"
            >
                <Link to={href}>
                    {button}
                </Link>
            </Button>
        </div>
    );
}