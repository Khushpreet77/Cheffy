import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      // Safety: ensure a row exists
      const { data: created, error: insErr } = await context.supabase
        .from("profiles")
        .insert({ id: context.userId })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);
      return created;
    }
    // Touch last_active_at
    await context.supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", context.userId);
    return data;
  });

const UpdateSchema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  username: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscores")
    .nullable()
    .optional(),
  bio: z.string().max(300).nullable().optional(),
  avatar_data_url: z.string().max(400_000).nullable().optional(),
  preferred_cuisine: z.string().max(60).nullable().optional(),
  dietary_preference: z.string().max(60).nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  language: z.string().max(20).nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).nullable().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [all, saved, liked] = await Promise.all([
      context.supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      context.supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("saved", true),
      context.supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("liked", true),
    ]);
    return {
      generated: all.count ?? 0,
      saved: saved.count ?? 0,
      liked: liked.count ?? 0,
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Delete profile + recipes cascade via FK/RLS
    await supabaseAdmin.from("recipes").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
