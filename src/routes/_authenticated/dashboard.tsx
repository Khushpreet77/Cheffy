import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Utensils, Loader2, ChefHat, ArrowRight } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { RecipeCard, type RecipeRow } from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateByDish, generateByIngredients } from "@/lib/recipes.functions";

const CUISINES = [
  "Indian",
  "Italian",
  "Mexican",
  "Chinese",
  "Thai",
  "Japanese",
  "Mediterranean",
  "French",
  "American",
  "Middle Eastern",
  "Korean",
  "Any",
];
const DIETS = ["Veg", "Non-Veg", "Vegan", "Eggetarian", "Keto", "Gluten-Free", "Any"];

const SUGGESTIONS = [
  "Butter Chicken",
  "Pad Thai",
  "Tonkotsu Ramen",
  "Margherita Pizza",
  "Beef Tacos",
];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Cook — Cheffy" },
      { name: "description", content: "Generate personalized AI recipes by dish or ingredients." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"dish" | "ingredients">("dish");
  const [dish, setDish] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [cuisine, setCuisine] = useState("Any");
  const [diet, setDiet] = useState("Any");

  const genDish = useServerFn(generateByDish);
  const genIng = useServerFn(generateByIngredients);

  const byDish = useMutation({
    mutationFn: (d: string) => genDish({ data: { dish: d } }),
    onSuccess: (r) => navigate({ to: "/recipes/$id", params: { id: r.id } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const byIng = useMutation({
    mutationFn: (v: { ingredients: string; cuisine: string; diet: string }) => genIng({ data: v }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: (rows) => toast.success(`Cheffy served up ${rows?.length ?? 0} ideas`),
  });

  const loading = byDish.isPending || byIng.isPending;

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            What are we cooking <span className="font-display italic text-primary">today</span>
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-md mx-auto">
            Name a dish, or list what's in your fridge. Cheffy plates up a full recipe in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl glass-strong shadow-elevated overflow-hidden"
        >
          <div className="flex border-b border-border/60">
            {[
              { id: "dish" as const, label: "By dish", icon: ChefHat },
              { id: "ingredients" as const, label: "By ingredients", icon: Utensils },
            ].map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex-1 inline-flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                  {active && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 md:p-8">
            {tab === "dish" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="dish"
                    className="text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Dish name
                  </Label>
                  <Input
                    id="dish"
                    placeholder="e.g. Butter Chicken, Pad Thai, Tonkotsu Ramen…"
                    value={dish}
                    onChange={(e) => setDish(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dish.trim() && !loading) byDish.mutate(dish.trim());
                    }}
                    className="h-12 text-base bg-background/40 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setDish(s)}
                        className="text-[11px] px-2 py-1 rounded-md border border-border bg-surface/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <PrimaryCTA
                  loading={byDish.isPending}
                  disabled={loading || !dish.trim()}
                  onClick={() => dish.trim() && byDish.mutate(dish.trim())}
                />
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="ing"
                    className="text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    What's in your kitchen?
                  </Label>
                  <Textarea
                    id="ing"
                    placeholder="chicken, tomato, garlic, cream, onion…"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    rows={3}
                    className="text-base bg-background/40 border-border resize-none focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Cuisine
                    </Label>
                    <Select value={cuisine} onValueChange={setCuisine}>
                      <SelectTrigger className="h-11 bg-background/40 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUISINES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Diet
                    </Label>
                    <Select value={diet} onValueChange={setDiet}>
                      <SelectTrigger className="h-11 bg-background/40 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIETS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <PrimaryCTA
                  loading={byIng.isPending}
                  disabled={loading || !ingredients.trim()}
                  onClick={() =>
                    ingredients.trim() &&
                    byIng.mutate({ ingredients: ingredients.trim(), cuisine, diet })
                  }
                />
              </motion.div>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Recipes take ~5–10 seconds. You can like or save any recipe to keep it forever.
        </p>

        <AnimatePresence>
          {byIng.data && byIng.data.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-16"
            >
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {byIng.data.length} ideas from your kitchen
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap any card to view the full recipe.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
                  Fresh
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {byIng.data.map((r, i) => (
                  <RecipeCard key={r.id} recipe={r as unknown as RecipeRow} index={i} />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <PoweredByBadge />
      </main>
    </div>
  );
}

function PrimaryCTA({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full h-12 rounded-xl bg-gradient-to-b from-primary to-ember text-primary-foreground font-semibold text-sm ring-hairline shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99] hover:brightness-110"
    >
      <span className="inline-flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Cheffy is cooking…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate recipe
            <ArrowRight className="h-4 w-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </>
        )}
      </span>
    </button>
  );
}
