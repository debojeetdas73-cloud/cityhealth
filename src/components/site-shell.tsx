import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, CalendarDays, ChevronRight, HeartPulse, Menu, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { label: "Find Doctors", to: "/search" as const },
  { label: "Hospitals", to: "/hospitals" as const },
  { label: "Health Packages", to: "/health-packages" as const },
  { label: "Membership", to: "/subscriptions" as const },
];

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  return <>{nav.map((item) => (
    <Link key={item.to} to={item.to} className={mobile ? "flex items-center justify-between border-b py-4 text-base font-semibold" : "text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"} activeProps={{ className: mobile ? "flex items-center justify-between border-b py-4 text-base font-semibold text-primary" : "text-sm font-semibold text-primary" }}>
      {item.label}{mobile && <ChevronRight className="size-4" />}
    </Link>
  ))}</>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setIsAdmin(false); return () => { active = false; }; }
    void supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "super_admin"]).limit(1).maybeSingle().then(({ data }) => {
      if (active) setIsAdmin(Boolean(data));
    });
    return () => { active = false; };
  }, [user]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-navy px-4 py-2 text-center text-xs font-medium text-navy-foreground">
        For medical emergencies, call 112 or visit your nearest emergency department.
      </div>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="cityhealth home">
            <BrandMark />
            <span className="font-display text-xl font-bold text-navy">cityhealth</span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex"><NavLinks /></nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Button asChild variant="ghost" size="sm"><Link to="/assistant"><Bot />Ask AI</Link></Button>
            {user ? (
              <><Button asChild variant="outline" size="sm"><Link to="/dashboard"><UserRound />My account</Link></Button>{isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/admin">Admin</Link></Button>}<Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button></>
            ) : <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>}
          </div>
          <Sheet>
            <SheetTrigger asChild><Button className="lg:hidden" size="icon" variant="ghost" aria-label="Open menu"><Menu /></Button></SheetTrigger>
            <SheetContent className="p-6">
              <div className="mb-6 flex items-center gap-2"><BrandMark /><span className="font-display font-bold">cityhealth</span></div>
              <nav className="flex flex-col"><NavLinks mobile /><Link to="/assistant" className="flex items-center justify-between border-b py-4 font-semibold">Ask AI <Bot className="size-4" /></Link><Link to={user ? "/dashboard" : "/auth"} className="flex items-center justify-between border-b py-4 font-semibold">{user ? (isAdmin ? "My account · Admin" : "My account") : "Sign in"}<UserRound className="size-4" /></Link></nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2"><div className="flex items-center gap-2"><BrandMark /><span className="font-display text-xl font-bold">cityhealth</span></div><p className="mt-4 max-w-md text-sm leading-6 text-navy-foreground/70">Trusted healthcare discovery, appointments and health support—all in one place.</p></div>
          <div><h2 className="font-display font-semibold">Care</h2><div className="mt-4 grid gap-3 text-sm text-navy-foreground/70"><Link to="/search">Find a doctor</Link><Link to="/health-packages">Health packages</Link><Link to="/assistant">AI assistant</Link></div></div>
          <div><h2 className="font-display font-semibold">Trust</h2><div className="mt-4 grid gap-3 text-sm text-navy-foreground/70"><span className="flex gap-2"><ShieldCheck className="size-4" />Secure patient data</span><span className="flex gap-2"><CalendarDays className="size-4" />Simple booking</span><span className="flex gap-2"><HeartPulse className="size-4" />Care-first design</span></div></div>
        </div>
        <div className="border-t border-navy-foreground/10 px-4 py-5 text-center text-xs text-navy-foreground/55">© 2026 cityhealth. Information is educational and does not replace medical advice.</div>
      </footer>
    </div>
  );
}