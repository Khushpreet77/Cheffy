import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/lib/recipes.functions";
import { NavBar } from "@/components/NavBar";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { RecipeCard, type RecipeRow } from "@/components/RecipeCard";
import { Bookmark, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved — Cheffy" }] }),
  component: () => (
    <RecipeList
      filter="saved"
      title="Saved recipes"
      subtitle="Your keepers — the ones you'll cook again and again."
      emptyTitle="No saved recipes yet"
      emptyBody="Generate a recipe and tap the bookmark to keep it here."
    />
  ),
});

export function RecipeList({
  filter,
  title,
  subtitle,
  emptyTitle,
  emptyBody,
}: {
  filter: "all" | "liked" | "saved";
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const fn = useServerFn(listRecipes);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["recipes", filter],
    queryFn: () => fn({ data: { filter } }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-end justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">{subtitle}</p>
          </div>
          {data && data.length > 0 && (
            <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
              {data.length} {data.length === 1 ? "recipe" : "recipes"}
            </span>
          )}
        </motion.header>

        {isPending ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl skeleton" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 rounded-2xl border border-destructive/30 bg-destructive/5">
            <p className="text-destructive mb-4">Couldn't load your recipes.</p>
            <button
              onClick={() => refetch()}
              className="text-sm underline underline-offset-4 hover:text-foreground"
            >
              Try again
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-surface/30">
            <div className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{emptyTitle}</h2>
            <p className="text-sm text-muted-foreground mb-6">{emptyBody}</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-b from-primary to-ember text-primary-foreground text-sm font-semibold shadow-glow ring-hairline hover:brightness-110 transition"
            >
              <Sparkles className="h-4 w-4" /> Start cooking
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((r, i) => (
              <RecipeCard key={r.id} recipe={r as RecipeRow} index={i} />
            ))}
          </div>
        )}
        <PoweredByBadge />
      </main>
    </div>
  );
}
