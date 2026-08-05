import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, Utensils, Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PoweredByBadge } from "@/components/PoweredByBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cheffy" },
      {
        name: "description",
        content:
          "Cheffy generates personalized recipes by dish name or the ingredients you have on hand. A premium AI cooking companion.",
      },
      { property: "og:title", content: "Cheffy" },
      {
        property: "og:description",
        content:
          "Cheffy generates personalized recipes by dish name or the ingredients you have on hand. A premium AI cooking companion.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-dvh relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight">Cheffy</span>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-16 md:pt-24 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[0.98]">
            Your personal chef,
            <br />
            <span className="font-display italic text-primary">always on call.</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Name a dish, or list what's in your fridge. Cheffy plates up a full recipe —
            ingredients, method, chef tips — in seconds.
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-b from-primary to-ember text-primary-foreground text-sm font-semibold shadow-glow ring-hairline hover:brightness-110 transition"
            >
              Start cooking free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-border bg-surface/60 hover:bg-surface text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4 mt-24 text-left">
          {[
            {
              icon: ChefHat,
              title: "Recipe by dish",
              body: "Craving butter chicken? Type it. Full recipe, plated in seconds.",
            },
            {
              icon: Utensils,
              title: "By ingredients",
              body: "Tell Cheffy what you have. Pick cuisine and diet — done.",
            },
            {
              icon: Heart,
              title: "Save & revisit",
              body: "Like and save recipes so your favorites are one click away.",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
              className="group relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-6 hover:border-primary/30 transition-colors overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary mb-4">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
        <PoweredByBadge />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built with care · Cheffy © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
