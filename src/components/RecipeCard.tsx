import { Link } from "@tanstack/react-router";
import { Heart, Bookmark, Clock, Users, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleRecipeFlag } from "@/lib/recipes.functions";
import { motion } from "framer-motion";
import { toast } from "sonner";

export interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  diet: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: string | null;
  liked: boolean;
  saved: boolean;
}

export function RecipeCard({ recipe, index = 0 }: { recipe: RecipeRow; index?: number }) {
  const qc = useQueryClient();
  const toggle = useServerFn(toggleRecipeFlag);

  const mutate = useMutation({
    mutationFn: (v: { field: "liked" | "saved"; value: boolean }) =>
      toggle({ data: { id: recipe.id, field: v.field, value: v.value } }),
    // Optimistic: patch every ["recipes", ...] cache entry immediately.
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["recipes"] });
      const snapshots = qc.getQueriesData<RecipeRow[] | RecipeRow>({ queryKey: ["recipes"] });
      qc.setQueriesData<RecipeRow[] | RecipeRow>({ queryKey: ["recipes"] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((r) => (r.id === recipe.id ? { ...r, [v.field]: v.value } : r));
        }
        if (typeof old === "object" && (old as RecipeRow).id === recipe.id) {
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

  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-soft hover:shadow-elevated"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <Link to="/recipes/$id" params={{ id: recipe.id }} className="block p-5 pr-16">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.cuisine && (
            <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {recipe.cuisine}
            </span>
          )}
          {recipe.diet && (
            <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
              {recipe.diet}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{recipe.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {totalTime}m
            </span>
          )}
          {recipe.servings && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {recipe.servings}
            </span>
          )}
          {recipe.difficulty && (
            <span className="ml-auto inline-flex items-center gap-1 text-foreground/70">
              {recipe.difficulty}{" "}
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </span>
          )}
        </div>
      </Link>

      <div className="absolute top-4 right-4 flex gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            mutate.mutate({ field: "liked", value: !recipe.liked });
          }}
          className={`grid place-items-center h-8 w-8 rounded-lg border transition-all ${
            recipe.liked
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
          }`}
          aria-label={recipe.liked ? "Unlike" : "Like"}
        >
          <Heart className={`h-3.5 w-3.5 ${recipe.liked ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            mutate.mutate({ field: "saved", value: !recipe.saved });
          }}
          className={`grid place-items-center h-8 w-8 rounded-lg border transition-all ${
            recipe.saved
              ? "bg-accent/15 text-accent border-accent/30"
              : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-accent/30"
          }`}
          aria-label={recipe.saved ? "Unsave" : "Save"}
        >
          <Bookmark className={`h-3.5 w-3.5 ${recipe.saved ? "fill-current" : ""}`} />
        </button>
      </div>
    </motion.article>
  );
}
