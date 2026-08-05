import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChefHat, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PoweredByBadge } from "@/components/PoweredByBadge";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Cheffy" },
      { name: "description", content: "Sign in to Cheffy to generate personalized AI recipes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // When email confirmation is enabled, Supabase deliberately returns no
        // session. Keep the visitor on this page until they verify their email.
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await router.invalidate();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        /failed to fetch|networkerror|network request failed/i.test(message)
          ? "Unable to reach Supabase. Check the project URL and that the project is active."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-ember shadow-glow">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Cheffy</span>
        </Link>

        <div className="rounded-2xl glass-strong shadow-elevated p-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "signin"
              ? "Sign in to cook up something delicious."
              : "Free forever. No credit card required."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-surface/60 hover:bg-surface text-sm font-medium transition-colors disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-elevated/90 px-2 text-muted-foreground">or with email</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 bg-background/40 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-background/40 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-gradient-to-b from-primary to-ember text-primary-foreground text-sm font-semibold shadow-glow ring-hairline hover:brightness-110 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Working…
                </>
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === "signin" ? "New to Cheffy?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline underline-offset-4"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
        <PoweredByBadge />
      </motion.div>
    </div>
  );
}
