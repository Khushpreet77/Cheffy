import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createGeminiClient } from "./ai-gateway.server";

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  diet: z.string(),
  servings: z.number().int(),
  prep_time_minutes: z.number().int(),
  cook_time_minutes: z.number().int(),
  difficulty: z.string(),
  ingredients: z.array(z.object({ item: z.string(), quantity: z.string() })),
  steps: z.array(z.string()),
  tips: z.array(z.string()),
});

type Recipe = z.infer<typeof RecipeSchema>;

function toRecipeGenerationError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "";

  if (/insufficient_balance|insufficient balance|resource_exhausted|quota|rate limit/i.test(message)) {
    return new Error("AI recipe generation is temporarily unavailable: check your Gemini API quota and billing.");
  }

  if (/401|unauthorized|invalid api key/i.test(message)) {
    return new Error("The Gemini API key is invalid. Update GEMINI_API_KEY and restart the server.");
  }

  return new Error("Cheffy could not generate a recipe right now. Please try again.");
}

async function generateRecipe(prompt: string): Promise<Recipe> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = createGeminiClient(key)("gemini-flash-latest");

  const systemPrompt = `You are Cheffy, a warm and knowledgeable personal AI chef. Generate detailed, delicious recipes.
Return ONLY valid JSON matching this exact shape:
{
  "title": "string",
  "description": "one-sentence enticing description",
  "cuisine": "string (e.g. Indian, Italian)",
  "diet": "string (e.g. Veg, Non-Veg, Vegan, Keto)",
  "servings": integer,
  "prep_time_minutes": integer,
  "cook_time_minutes": integer,
  "difficulty": "Easy | Medium | Hard",
  "ingredients": [{"item":"string","quantity":"string"}],
  "steps": ["step 1", "step 2", ...],
  "tips": ["chef tip", ...]
}
Be practical, precise with quantities, and include 4-8 numbered steps and 2-4 tips.`;

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: RecipeSchema }),
      system: systemPrompt,
      prompt,
    });
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      // Try fallback parse of raw text
      try {
        const cleaned = ((error as { text?: string }).text ?? "")
          .replace(/```json|```/g, "")
          .trim();
        return RecipeSchema.parse(JSON.parse(cleaned));
      } catch {
        throw new Error("Cheffy had trouble writing this recipe. Try again.");
      }
    }
    throw toRecipeGenerationError(error);
  }
}

export const generateByDish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dish: z.string().min(2).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const recipe = await generateRecipe(
      `Create a full authentic recipe for: "${data.dish}". Choose the most appropriate cuisine and diet type.`,
    );
    const { data: row, error } = await context.supabase
      .from("recipes")
      .insert({
        user_id: context.userId,
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        diet: recipe.diet,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        difficulty: recipe.difficulty,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips,
        source_type: "dish",
        source_input: { dish: data.dish },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

async function generateRecipes(prompt: string, count: number): Promise<Recipe[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = createGeminiClient(key)("gemini-flash-latest");

  const ManySchema = z.object({ recipes: z.array(RecipeSchema) });
  const systemPrompt = `You are Cheffy, a warm and knowledgeable personal AI chef. Generate ${count} DISTINCT recipe ideas — each must be a genuinely different dish (different technique or dish concept), not variations of the same dish. Be practical and precise with quantities. Include 4-8 steps and 2-4 tips per recipe.
Return ONLY valid JSON matching this exact shape:
{ "recipes": [ { "title": "string", "description": "one-sentence enticing description", "cuisine": "string", "diet": "string", "servings": integer, "prep_time_minutes": integer, "cook_time_minutes": integer, "difficulty": "Easy | Medium | Hard", "ingredients": [{"item":"string","quantity":"string"}], "steps": ["step 1", ...], "tips": ["tip", ...] } ] }`;

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: ManySchema }),
      system: systemPrompt,
      prompt,
    });
    return output.recipes;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        const cleaned = ((error as { text?: string }).text ?? "")
          .replace(/```json|```/g, "")
          .trim();
        return ManySchema.parse(JSON.parse(cleaned)).recipes;
      } catch {
        throw new Error("Cheffy had trouble writing these recipes. Try again.");
      }
    }
    throw toRecipeGenerationError(error);
  }
}

export const generateByIngredients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ingredients: z.string().min(2).max(500),
        cuisine: z.string().min(1).max(60),
        diet: z.string().min(1).max(60),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const cuisineHint =
      data.cuisine === "Any" ? "any cuisine that fits best" : `${data.cuisine} cuisine`;
    const dietHint = data.diet === "Any" ? "any diet" : `${data.diet}`;
    const recipes = await generateRecipes(
      `Suggest 4 DIFFERENT ${dietHint} dishes from ${cuisineHint} that can be made primarily using these ingredients: ${data.ingredients}. Assume basic pantry staples (salt, oil, spices, water). Each dish must be distinct — different technique or concept, not variations of the same dish.`,
      4,
    );

    const rows = recipes.map((recipe) => ({
      user_id: context.userId,
      title: recipe.title,
      description: recipe.description,
      cuisine: data.cuisine === "Any" ? recipe.cuisine : data.cuisine,
      diet: data.diet === "Any" ? recipe.diet : data.diet,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      tips: recipe.tips,
      source_type: "ingredients",
      source_input: data,
    }));

    const { data: inserted, error } = await context.supabase.from("recipes").insert(rows).select();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ filter: z.enum(["all", "liked", "saved"]).default("all") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (data.filter === "liked") q = q.eq("liked", true);
    if (data.filter === "saved") q = q.eq("saved", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });

export const getRecipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("recipes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Recipe not found");
    return row;
  });

export const toggleRecipeFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        field: z.enum(["liked", "saved"]),
        value: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const update = { [data.field]: data.value } as { liked?: boolean; saved?: boolean };
    const { error } = await context.supabase.from("recipes").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("recipes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
