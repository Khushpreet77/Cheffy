import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe, toggleRecipeFlag, deleteRecipe } from "@/lib/recipes.functions";
import { NavBar } from "@/components/NavBar";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { ArrowLeft, Heart, Bookmark, Clock, Users, ChefHat, Trash2, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { RecipeRow } from "@/components/RecipeCard";

export const Route = createFileRoute("/_authenticated/recipes/$id")({
  component: RecipeDetail,
});

interface Ingredient {
  item: string;
  quantity: string;
}

function RecipeDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getRecipe);
  const toggle = useServerFn(toggleRecipeFlag);
  const del = useServerFn(deleteRecipe);

  const {
    data: recipe,
    isPending,
    error,
  } = useQuery({
    queryKey: ["recipes", id],
    queryFn: () => get({ data: { id } }),
  });

  const flagMut = useMutation({
    mutationFn: (v: { field: "liked" | "saved"; value: boolean }) => toggle({ data: { id, ...v } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["recipes"] });
      const snapshots = qc.getQueriesData<RecipeRow[] | RecipeRow>({ queryKey: ["recipes"] });
      qc.setQueriesData<RecipeRow[] | RecipeRow>({ queryKey: ["recipes"] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((r) => (r.id === id ? { ...r, [v.field]: v.value } : r));
        }
        if (typeof old === "object" && (old as RecipeRow).id === id) {
          return { ...(old as RecipeRow), [v.field]: v.value };
        }
        return old;
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error("Couldn't update. Try again.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
    onSuccess: (_r, v) => {
      if (v.field === "saved") toast.success(v.value ? "Saved" : "Removed from saved");
      if (v.field === "liked" && v.value) toast.success("Liked");
    },
  });

  const delMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Recipe deleted");
      qc.invalidateQueries({ queryKey: ["recipes"] });
      navigate({ to: "/dashboard" });
    },
  });

  if (isPending) {
    return (
      <div className="min-h-dvh">
        <NavBar />
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <div className="h-6 w-24 skeleton" />
          <div className="h-10 w-2/3 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-4/5 skeleton" />
          <div className="h-32 w-full skeleton mt-6" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-dvh">
        <NavBar />
        <div className="max-w-3xl mx-auto p-10 text-center">
          <p className="text-muted-foreground mb-4">Recipe not found.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Back to cooking
          </Link>
        </div>
      </div>
    );
  }

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) ?? [];
  const steps = (recipe.steps as unknown as string[]) ?? [];
  const tips = (recipe.tips as unknown as string[]) ?? [];
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-wrap gap-1.5 mb-4">
            {recipe.cuisine && (
              <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {recipe.cuisine}
              </span>
            )}
            {recipe.diet && (
              <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                {recipe.diet}
              </span>
            )}
            {recipe.difficulty && (
              <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                {recipe.difficulty}
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] mb-4">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              {recipe.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 py-5 mb-10 border-y border-border/60 text-sm">
            {recipe.prep_time_minutes ? (
              <Stat label="Prep" value={`${recipe.prep_time_minutes}m`} />
            ) : null}
            {recipe.cook_time_minutes ? (
              <Stat
                label="Cook"
                value={`${recipe.cook_time_minutes}m`}
                icon={<Flame className="h-3.5 w-3.5" />}
              />
            ) : null}
            {totalTime > 0 && (
              <Stat
                label="Total"
                value={`${totalTime}m`}
                icon={<Clock className="h-3.5 w-3.5" />}
              />
            )}
            {recipe.servings && (
              <Stat
                label="Serves"
                value={String(recipe.servings)}
                icon={<Users className="h-3.5 w-3.5" />}
              />
            )}

            <div className="ml-auto flex gap-1.5">
              <IconToggle
                active={recipe.liked}
                onClick={() => flagMut.mutate({ field: "liked", value: !recipe.liked })}
                label={recipe.liked ? "Unlike" : "Like"}
                activeClass="bg-primary/15 text-primary border-primary/30"
              >
                <Heart className={`h-4 w-4 ${recipe.liked ? "fill-current" : ""}`} />
              </IconToggle>
              <IconToggle
                active={recipe.saved}
                onClick={() => flagMut.mutate({ field: "saved", value: !recipe.saved })}
                label={recipe.saved ? "Unsave" : "Save"}
                activeClass="bg-accent/15 text-accent border-accent/30"
              >
                <Bookmark className={`h-4 w-4 ${recipe.saved ? "fill-current" : ""}`} />
              </IconToggle>
              <button
                onClick={() => {
                  if (confirm("Delete this recipe?")) delMut.mutate();
                }}
                className="grid place-items-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                aria-label="Delete recipe"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-[280px_1fr] gap-10">
            <aside>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Ingredients
              </h2>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-4 text-sm py-2 border-b border-border/50"
                  >
                    <span className="text-foreground">{ing.item}</span>
                    <span className="text-muted-foreground whitespace-nowrap font-medium">
                      {ing.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Method
              </h2>
              <ol className="space-y-5">
                {steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-4"
                  >
                    <div className="shrink-0 grid place-items-center w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                      {i + 1}
                    </div>
                    <p className="pt-0.5 leading-relaxed text-[15px] text-foreground/90">{step}</p>
                  </motion.li>
                ))}
              </ol>

              {tips.length > 0 && (
                <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/5 p-5">
                  <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2 text-accent">
                    <ChefHat className="h-4 w-4" /> Chef's tips
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {tips.map((t, i) => (
                      <li key={i} className="flex gap-2 text-foreground/90">
                        <span className="text-accent">·</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </motion.div>
        <PoweredByBadge />
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold inline-flex items-center gap-1.5 mt-0.5">
        {icon} {value}
      </div>
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  activeClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid place-items-center h-9 w-9 rounded-lg border transition-all active:scale-95 ${
        active
          ? activeClass
          : "bg-surface/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
      }`}
    >
      {children}
    </button>
  );
}
