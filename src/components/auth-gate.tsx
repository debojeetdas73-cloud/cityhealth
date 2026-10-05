import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

export function AuthGate({ children, title = "Sign in to continue" }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Create a free cityhealth account to book appointments and keep your health details in one place.
        </p>
        <Button asChild className="mt-6"><Link to="/auth">Sign in or create account</Link></Button>
      </div>
    );
  }

  return <>{children}</>;
}
