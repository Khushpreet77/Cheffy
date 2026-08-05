import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ChefHat, Heart, Bookmark, Sparkles, User } from "lucide-react";
import { useMyProfile } from "@/hooks/use-my-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NavBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useMyProfile();

  const links = [
    { to: "/dashboard", label: "Cook", icon: Sparkles },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/liked", label: "Liked", icon: Heart },
  ] as const;

  const initials = (profile?.display_name || "U")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="grid place-items-center h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-ember shadow-glow">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Cheffy</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 rounded-full border border-border bg-surface/50 p-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-elevated text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/profile"
          className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-border bg-surface/40 hover:bg-surface transition-colors"
          aria-label="Open profile"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_data_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/30 to-ember/30 text-foreground">
              {initials || <User className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-[12px] font-medium text-foreground/90 max-w-[120px] truncate">
            {profile?.display_name ?? "Account"}
          </span>
        </Link>
      </div>

      {/* mobile bottom-ish tab bar */}
      <nav className="md:hidden flex justify-around border-t border-border/60 py-1.5">
        {[...links, { to: "/profile" as const, label: "Profile", icon: User }].map((l) => {
          const Icon = l.icon;
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

// Keep signOut helper for reuse elsewhere.
export function useSignOut() {
  const router = useRouter();
  return async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };
}
