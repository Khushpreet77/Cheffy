import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Camera,
  Trash2,
  LogOut,
  Loader2,
  ShieldAlert,
  Sparkles,
  Bookmark,
  Heart,
  Mail,
  Calendar,
  Clock,
  KeyRound,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/NavBar";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getMyProfile,
  updateMyProfile,
  getMyStats,
  deleteMyAccount,
} from "@/lib/profile.functions";
import { fileToCircularAvatarDataUrl } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Cheffy" },
      { name: "description", content: "Manage your Cheffy account and preferences." },
    ],
  }),
  component: ProfilePage,
});

const CUISINES = [
  "Any",
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
];
const DIETS = ["Any", "Veg", "Non-Veg", "Vegan", "Eggetarian", "Keto", "Gluten-Free"];
const LANGUAGES = [
  { v: "en", l: "English" },
  { v: "es", l: "Spanish" },
  { v: "fr", l: "French" },
  { v: "de", l: "German" },
  { v: "hi", l: "Hindi" },
  { v: "it", l: "Italian" },
  { v: "ja", l: "Japanese" },
  { v: "pt", l: "Portuguese" },
  { v: "zh", l: "Chinese" },
];

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const getProfileFn = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);
  const getStatsFn = useServerFn(getMyStats);
  const deleteAccountFn = useServerFn(deleteMyAccount);

  const profileQ = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => getProfileFn(),
    staleTime: 60_000,
  });
  const statsQ = useQuery({
    queryKey: ["profile", "stats"],
    queryFn: () => getStatsFn(),
    staleTime: 30_000,
  });

  const [email, setEmail] = useState<string>("");
  const [provider, setProvider] = useState<string>("Email");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? "");
      setCreatedAt(u.created_at ?? null);
      const p = (u.app_metadata?.provider as string) || "email";
      setProvider(p === "google" ? "Google" : p === "email" ? "Email" : p);
    });
  }, []);

  const [form, setForm] = useState({
    display_name: "",
    username: "",
    bio: "",
    preferred_cuisine: "Any",
    dietary_preference: "Any",
    country: "",
    language: "en",
  });

  useEffect(() => {
    if (!profileQ.data) return;
    const p = profileQ.data;
    setForm({
      display_name: p.display_name ?? "",
      username: p.username ?? "",
      bio: p.bio ?? "",
      preferred_cuisine: p.preferred_cuisine ?? "Any",
      dietary_preference: p.dietary_preference ?? "Any",
      country: p.country ?? "",
      language: p.language ?? "en",
    });
  }, [profileQ.data]);

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateProfileFn({ data: patch }),
    onSuccess: (row) => {
      qc.setQueryData(["profile", "me"], row);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const [uploading, setUploading] = useState(false);
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8MB).");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToCircularAvatarDataUrl(file);
      await update.mutateAsync({ avatar_data_url: dataUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    await update.mutateAsync({ avatar_data_url: null });
  };

  const saveAll = () => update.mutate(form);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const doDelete = async () => {
    try {
      await deleteAccountFn();
      await supabase.auth.signOut();
      qc.clear();
      navigate({ to: "/", replace: true });
      toast.success("Account deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const profile = profileQ.data;
  const initials = (form.display_name || email || "U")
    .split(/[\s@]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14 space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl glass-strong shadow-elevated p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6"
        >
          <div className="relative">
            <Avatar className="h-28 w-28 ring-2 ring-primary/20 shadow-glow">
              <AvatarImage src={profile?.avatar_data_url ?? undefined} alt="" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/30 to-ember/30">
                {initials || <UserIcon className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid place-items-center h-9 w-9 rounded-full bg-gradient-to-b from-primary to-ember text-primary-foreground shadow-glow ring-2 ring-background disabled:opacity-60"
              aria-label="Change avatar"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {form.display_name || "Your profile"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {email}
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-surface/60 border border-border text-muted-foreground">
                Signed in with {provider}
              </span>
              {createdAt && (
                <span className="px-2 py-0.5 rounded-md bg-surface/60 border border-border text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined {new Date(createdAt).toLocaleDateString()}
                </span>
              )}
              {profile?.last_active_at && (
                <span className="px-2 py-0.5 rounded-md bg-surface/60 border border-border text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last active{" "}
                  {new Date(profile.last_active_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {profile?.avatar_data_url && (
              <button
                onClick={removeAvatar}
                className="mt-3 text-[12px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>
        </motion.header>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              label: "Generated",
              value: statsQ.data?.generated ?? 0,
              icon: Sparkles,
              tone: "primary",
            },
            { label: "Saved", value: statsQ.data?.saved ?? 0, icon: Bookmark, tone: "accent" },
            { label: "Liked", value: statsQ.data?.liked ?? 0, icon: Heart, tone: "primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl glass p-4 sm:p-5 border border-border/70">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
                <s.icon
                  className={`h-4 w-4 ${s.tone === "primary" ? "text-primary" : "text-accent"}`}
                />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </section>

        {/* Settings */}
        <section className="rounded-2xl glass-strong shadow-soft p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Profile settings</h2>
              <p className="text-sm text-muted-foreground">Personalize how Cheffy talks to you.</p>
            </div>
            <button
              onClick={saveAll}
              disabled={update.isPending}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-b from-primary to-ember text-primary-foreground text-sm font-semibold shadow-glow ring-hairline disabled:opacity-60"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Display name">
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Your name"
              />
            </Field>
            <Field label="Username">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="chef_yourname"
              />
            </Field>
            <Field label="Bio" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell the world what you love to cook."
                className="resize-none"
              />
            </Field>
            <Field label="Preferred cuisine">
              <Select
                value={form.preferred_cuisine}
                onValueChange={(v) => setForm({ ...form, preferred_cuisine: v })}
              >
                <SelectTrigger>
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
            </Field>
            <Field label="Dietary preference">
              <Select
                value={form.dietary_preference}
                onValueChange={(v) => setForm({ ...form, dietary_preference: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIETS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g. India"
              />
            </Field>
            <Field label="Language">
              <Select
                value={form.language}
                onValueChange={(v) => setForm({ ...form, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.v} value={l.v}>
                      {l.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        {/* Account */}
        <section className="rounded-2xl glass-strong shadow-soft p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Account</h2>
          <p className="text-sm text-muted-foreground mb-5">Security and access to your account.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {provider === "Email" ? (
              <ChangePasswordDialog email={email} />
            ) : (
              <a
                href="https://myaccount.google.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-surface/40 hover:bg-surface p-4 text-left transition-colors"
              >
                <span className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">Manage Google account</span>
                    <span className="block text-xs text-muted-foreground">
                      Opens Google account settings.
                    </span>
                  </span>
                </span>
              </a>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center justify-between rounded-xl border border-border bg-surface/40 hover:bg-surface p-4 text-left transition-colors">
                  <span className="flex items-center gap-3">
                    <LogOut className="h-4 w-4 text-foreground/80" />
                    <span>
                      <span className="block text-sm font-medium">Sign out</span>
                      <span className="block text-xs text-muted-foreground">
                        End your session on this device.
                      </span>
                    </span>
                  </span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out of Cheffy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can sign back in anytime with the same account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={signOut}>Sign out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold tracking-tight text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete your account and all recipes. This cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors">
                    <Trash2 className="h-4 w-4" /> Delete account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All your recipes, saved items, and profile data will be permanently deleted.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={doDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>

        <PoweredByBadge />
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ChangePasswordDialog({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    if (next !== confirm) return toast.error("Passwords don't match.");
    if (next === current) return toast.error("New password must differ from current.");
    setBusy(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) throw new Error("Current password is incorrect.");
      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) throw new Error(updErr.message);
      toast.success("Password updated");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between rounded-xl border border-border bg-surface/40 hover:bg-surface p-4 text-left transition-colors"
        >
          <span className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-medium">Change password</span>
              <span className="block text-xs text-muted-foreground">
                Update your account password.
              </span>
            </span>
          </span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change password</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your current password and choose a new one (minimum 8 characters).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="cur-pw"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Current password
            </Label>
            <Input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="new-pw"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              New password
            </Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="conf-pw"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Confirm new password
            </Label>
            <Input
              id="conf-pw"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <button
              type="submit"
              disabled={busy || !current || !next || !confirm}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gradient-to-b from-primary to-ember text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
