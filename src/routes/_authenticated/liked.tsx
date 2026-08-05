import { createFileRoute } from "@tanstack/react-router";
import { RecipeList } from "./saved";

export const Route = createFileRoute("/_authenticated/liked")({
  head: () => ({ meta: [{ title: "Liked — Cheffy" }] }),
  component: () => (
    <RecipeList
      filter="liked"
      title="Liked recipes"
      subtitle="Everything you've given a little heart to."
      emptyTitle="No liked recipes yet"
      emptyBody="Tap the heart on any recipe to add it here."
    />
  ),
});
