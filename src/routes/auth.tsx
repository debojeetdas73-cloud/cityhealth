import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/brand-mark";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account | cityhealth" },
      {
        name: "description",
        content:
          "Access your cityhealth account to book appointments, manage health records and family members.",
      },
      { property: "og:title", content: "Sign in | cityhealth" },
      {
        property: "og:description",
        content: "Access your cityhealth account to book and manage healthcare.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const passwordRecoveryRef = useRef(false);

  useEffect(() => {
    const enterPasswordRecovery = () => {
      passwordRecoveryRef.current = true;
      setIsPasswordRecovery(true);
    };

    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") {
      enterPasswordRecovery();
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") enterPasswordRecovery();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !passwordRecoveryRef.current) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const requestPasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Enter your email address first");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("If an account exists for this email, password reset instructions will be sent.");
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("new_password"));
    if (password !== String(form.get("confirm_password"))) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    passwordRecoveryRef.current = false;
    setIsPasswordRecovery(false);
    toast.success("Password updated");
    void navigate({ to: "/dashboard" });
  };

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    void navigate({ to: "/dashboard" });
  };

  const signUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: String(form.get("full_name")), phone: String(form.get("phone")) },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Your cityhealth account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Book appointments and keep your family's health details together.
        </p>
      </div>

      {isPasswordRecovery ? (
        <form
          onSubmit={updatePassword}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-card"
        >
          <h2 className="font-display text-lg font-semibold text-navy">Choose a new password</h2>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="new_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      ) : (
        <Tabs defaultValue="signin" className="rounded-lg border bg-card p-6 shadow-card">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input
                  id="si-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-password">Password</Label>
                <div className="relative">
                  <Input
                    id="si-password"
                    name="password"
                    type={showSignInPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    aria-pressed={showSignInPassword}
                    onClick={() => setShowSignInPassword((visible) => !visible)}
                  >
                    {showSignInPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={busy}
                onClick={() => void requestPasswordReset()}
              >
                Forgot password?
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" name="full_name" required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-phone">Phone</Label>
                <Input id="su-phone" name="phone" required autoComplete="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">Password</Label>
                <div className="relative">
                  <Input
                    id="su-password"
                    name="password"
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    aria-pressed={showSignUpPassword}
                    onClick={() => setShowSignUpPassword((visible) => !visible)}
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree that cityhealth gives general health guidance only and never
        replaces professional medical advice.{" "}
        <Link to="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
