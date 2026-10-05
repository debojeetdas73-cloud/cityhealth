import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    LogOut,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/hospital-invitation")({
    component: HospitalInvitationPage,
});

type Invitation = {
    id: string;
    hospital_id: string;
    invited_email: string;
    invited_role: string;
    status: string;
    expires_at: string;
    created_at: string;
    hospital: {
        id: string;
        name: string;
        city: string;
        address: string;
        phone: string;
        email: string | null;
        image_url: string | null;
    } | null;
};

function HospitalInvitationPage() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);

    const [invitation, setInvitation] =
        useState<Invitation | null>(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        loadInvitation();
    }, [user]);

    async function loadInvitation() {
        if (!user?.email) {
            setError("Unable to identify your email address.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            /*
             * Only pending invitations for the currently
             * signed-in user's email are requested.
             *
             * RLS provides the database-level protection.
             */

            const { data, error: invitationError } = await (
                supabase.from as any
            )("hospital_invitations")
                .select(
                    `
            id,
            hospital_id,
            invited_email,
            invited_role,
            status,
            expires_at,
            created_at,
            hospital:hospitals(
              id,
              name,
              city,
              address,
              phone,
              email,
              image_url
            )
          `
                )
                .eq("invited_email", user.email.toLowerCase())
                .eq("status", "pending")
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (invitationError) {
                console.error(invitationError);
                throw new Error(invitationError.message);
            }

            if (!data) {
                setInvitation(null);
                return;
            }

            setInvitation(data);
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load your invitation."
            );
        } finally {
            setLoading(false);
        }
    }

    async function acceptInvitation() {
        if (!invitation) return;

        setAccepting(true);
        setError("");
        setSuccess("");

        try {
            /*
             * The database function:
             *
             * 1. verifies the logged-in user
             * 2. checks the invitation email
             * 3. checks that invitation is still pending
             * 4. creates hospital_memberships
             * 5. creates the hospital_admin role
             * 6. marks invitation as accepted
             */

            const { error: rpcError } = await (
                supabase.rpc as any
            )("accept_hospital_invitation", {
                _invitation_id: invitation.id,
            });

            if (rpcError) {
                console.error(rpcError);
                throw new Error(rpcError.message);
            }

            setSuccess(
                "Invitation accepted successfully. Your Hospital Admin access is now active."
            );

            setTimeout(() => {
                navigate({
                    to: "/hospital-admin",
                });
            }, 1200);
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to accept the invitation."
            );
        } finally {
            setAccepting(false);
        }
    }

    async function handleLogout() {
        await signOut();
    }

    /*
     * --------------------------------------------------------
     * NOT LOGGED IN
     * --------------------------------------------------------
     */

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white border rounded-2xl p-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 className="w-7 h-7" />
                    </div>

                    <h1 className="mt-5 text-xl font-bold text-slate-900">
                        Hospital Invitation
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Please sign in with the email address that received
                        the hospital invitation.
                    </p>

                    <Link
                        to="/auth"
                        className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * LOADING
     * --------------------------------------------------------
     */

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />

                    <p className="text-sm text-slate-600">
                        Checking your hospital invitation...
                    </p>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * NO INVITATION
     * --------------------------------------------------------
     */

    if (!invitation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white border rounded-2xl p-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7" />
                    </div>

                    <h1 className="mt-5 text-xl font-bold text-slate-900">
                        No Active Invitation
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        We couldn't find an active hospital invitation for:
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-900 break-all">
                        {user?.email}
                    </p>

                    {error && (
                        <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex justify-center gap-3">
                        <Link
                            to="/"
                            className="px-4 py-2 rounded-lg border text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Go Home
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * INVITATION FOUND
     * --------------------------------------------------------
     */

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>

                        <div>
                            <p className="font-semibold text-slate-900">
                                CityHealth
                            </p>

                            <p className="text-xs text-slate-500">
                                Hospital Administration
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                        <Building2 className="w-8 h-8" />
                    </div>

                    <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-slate-900">
                        You’ve Been Invited
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        You have been invited to manage a hospital on CityHealth.
                    </p>
                </div>

                {/* INVITATION CARD */}

                <div className="mt-8 bg-white border rounded-2xl overflow-hidden shadow-sm">
                    {invitation.hospital?.image_url && (
                        <img
                            src={invitation.hospital.image_url}
                            alt={invitation.hospital.name}
                            className="w-full h-56 object-cover"
                        />
                    )}

                    <div className="p-6 sm:p-8">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                            Hospital
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-slate-900">
                            {invitation.hospital?.name || "Hospital"}
                        </h2>

                        {invitation.hospital && (
                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <p>
                                    <strong>City:</strong>{" "}
                                    {invitation.hospital.city}
                                </p>

                                <p>
                                    <strong>Address:</strong>{" "}
                                    {invitation.hospital.address}
                                </p>

                                <p>
                                    <strong>Phone:</strong>{" "}
                                    {invitation.hospital.phone}
                                </p>

                                {invitation.hospital.email && (
                                    <p>
                                        <strong>Email:</strong>{" "}
                                        {invitation.hospital.email}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t grid sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">
                                    Invited Email
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-900 break-all">
                                    {invitation.invited_email}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">
                                    Role
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    Hospital Administrator
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">
                                    Invitation Expires
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {new Date(
                                        invitation.expires_at
                                    ).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">
                                    Status
                                </p>

                                <p className="mt-1 text-sm font-medium text-green-700">
                                    Pending
                                </p>
                            </div>
                        </div>

                        {/* EMAIL WARNING */}

                        {user?.email?.toLowerCase() !==
                            invitation.invited_email.toLowerCase() && (
                                <div className="mt-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                                    <p className="text-sm font-medium text-yellow-800">
                                        Email mismatch
                                    </p>

                                    <p className="text-sm text-yellow-700 mt-1">
                                        This invitation was sent to{" "}
                                        <strong>
                                            {invitation.invited_email}
                                        </strong>
                                        , but you are signed in as{" "}
                                        <strong>{user?.email}</strong>.
                                    </p>
                                </div>
                            )}

                        {error && (
                            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />

                                    <p className="text-sm text-green-700">
                                        {success}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={acceptInvitation}
                            disabled={
                                accepting ||
                                !!success ||
                                user?.email?.toLowerCase() !==
                                invitation.invited_email.toLowerCase()
                            }
                            className="mt-7 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {accepting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Accepting Invitation...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Accepted
                                </>
                            ) : (
                                <>
                                    Accept Invitation
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <p className="mt-4 text-xs text-center text-slate-400">
                            By accepting this invitation, this account will receive
                            Hospital Admin access for this hospital.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}