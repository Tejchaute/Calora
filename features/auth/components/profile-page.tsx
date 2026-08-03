'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  CalendarClock,
  CalendarPlus,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Palette,
  Monitor,
  LogOut,
  Clock,
  CalendarDays,
  Sun,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingButton } from '@/components/shared/loading-button';
import { InlineAlert } from '@/components/shared/inline-alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useTheme } from 'next-themes';
import { useAuth } from '@/providers/auth-provider';
import { updateProfile, getProfileWithMeta } from '../services/profile.service';
import { updatePassword, signOut as signOutService } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';
import { getInitials, formatDate } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAccountPreferences } from '../hooks/use-account-preferences';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  phone: z
    .string()
    .max(30, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function PasswordField({
  label,
  name,
  control,
  placeholder,
  autoComplete,
  show,
  onToggle,
}: {
  label: string;
  name: 'currentPassword' | 'newPassword' | 'confirmPassword';
  control: any;
  placeholder: string;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...field}
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                className="pl-10 pr-10"
                autoComplete={autoComplete}
                aria-describedby={undefined}
              />
              <button
                type="button"
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function joinName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { firstName: initFirst, lastName: initLast } = useMemo(
    () => splitName(profile?.full_name || ''),
    [profile?.full_name]
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: initFirst, lastName: initLast, phone: profile?.phone || '' },
  });

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoadingMeta(true);
    getProfileWithMeta(user.id)
      .then(({ profile: fetchedProfile, lastSignIn: lastSignInAt }) => {
        if (!mounted) return;
        setLastSignIn(lastSignInAt);
        setCreatedAt(fetchedProfile?.created_at || user.created_at || null);
      })
      .catch(() => {
        if (!mounted) return;
        setCreatedAt(user.created_at || null);
      })
      .finally(() => {
        if (mounted) setLoadingMeta(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setFormError(null);
    try {
      await updateProfile(user.id, {
        full_name: joinName(values.firstName, values.lastName),
        phone: values.phone || '',
        avatar_url: avatarUrl,
      });
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : 'Failed to update profile. Please try again.';
      setFormError(message);
    }
  };

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordError(null);
    try {
      await updatePassword(values.newPassword);
      passwordForm.reset();
      toast.success('Password changed successfully');
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : 'Failed to change password. Please try again.';
      setPasswordError(message);
    }
  };

  const { theme, setTheme, resolvedTheme } = useTheme();
  const { preferences, loading: prefsLoading, save: savePreferences } = useAccountPreferences();
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ device: string } | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent;
    let browser = 'Unknown browser';
    if (/Edg|Edge/.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome/.test(ua)) browser = 'Google Chrome';
    else if (/Firefox/.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari/.test(ua)) browser = 'Apple Safari';
    let os = 'Unknown OS';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS|Macintosh/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    setSessionInfo({ device: `${browser} on ${os}` });
  }, []);

  const handleThemeChange = (next: string) => {
    setTheme(next);
  };

  const handlePrefChange = async (patch: Partial<typeof preferences>) => {
    setPrefsSaving(true);
    try {
      await savePreferences({ ...preferences, ...patch });
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutService();
      toast.success('Signed out successfully');
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Failed to sign out. Please try again.';
      toast.error(message);
    } finally {
      setSigningOut(false);
    }
  };

  const email = profile?.email || user?.email || '';
  const displayName = joinName(form.watch('firstName'), form.watch('lastName')) || email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and avatar.
        </p>
      </div>

      {formError && (
        <InlineAlert variant="error" title="Could not save profile">
          {formError}
        </InlineAlert>
      )}

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Camera className="h-5 w-5 text-primary" />
            Avatar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
              {getInitials(displayName || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <label htmlFor="avatar-url" className="text-sm font-medium text-foreground">
              Avatar URL
            </label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              aria-describedby="avatar-hint"
            />
            <p id="avatar-hint" className="text-xs text-muted-foreground">
              {/* TODO: integrate Supabase Storage file upload here */}
              Paste an image URL. Direct file upload will be available once storage is configured.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jane"
                          autoComplete="given-name"
                          aria-describedby={undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Doe"
                          autoComplete="family-name"
                          aria-describedby={undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="+1 234 567 890"
                          className="pl-10"
                          autoComplete="tel"
                          aria-describedby={undefined}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <LoadingButton type="submit" loading={form.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
                </LoadingButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passwordError && (
            <div className="mb-4">
              <InlineAlert variant="error" title="Could not change password">
                {passwordError}
              </InlineAlert>
            </div>
          )}
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-5"
            >
              <PasswordField
                label="Current password"
                name="currentPassword"
                control={passwordForm.control}
                placeholder="Enter your current password"
                autoComplete="current-password"
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField
                  label="New password"
                  name="newPassword"
                  control={passwordForm.control}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                />
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  control={passwordForm.control}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <LoadingButton
                  type="submit"
                  loading={passwordForm.formState.isSubmitting}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {passwordForm.formState.isSubmitting ? 'Updating...' : 'Change password'}
                </LoadingButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Palette className="h-5 w-5 text-primary" />
            Account Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme-select" className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Theme
            </Label>
            <Select value={theme ?? 'system'} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme-select" className="w-full sm:w-64" aria-label="Theme preference">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4" /> Light
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="h-4 w-4" /> Dark
                  </span>
                </SelectItem>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> System
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Currently active: {resolvedTheme ?? 'system'}
            </p>
          </div>

          {/* Time Format */}
          <div className="space-y-2">
            <Label htmlFor="time-format-select" className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time Format
            </Label>
            <Select
              value={preferences.timeFormat}
              onValueChange={(v) => handlePrefChange({ timeFormat: v as '12h' | '24h' })}
              disabled={prefsLoading || prefsSaving}
            >
              <SelectTrigger id="time-format-select" className="w-full sm:w-64" aria-label="Time format preference">
                <SelectValue placeholder="Select time format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week Start */}
          <div className="space-y-2">
            <Label htmlFor="week-start-select" className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Week Start Day
            </Label>
            <Select
              value={preferences.weekStart}
              onValueChange={(v) => handlePrefChange({ weekStart: v as 'sunday' | 'monday' })}
              disabled={prefsLoading || prefsSaving}
            >
              <SelectTrigger id="week-start-select" className="w-full sm:w-64" aria-label="Week start day preference">
                <SelectValue placeholder="Select week start day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prefsSaving && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Saving preferences...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Monitor className="h-5 w-5 text-primary" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="session-email-readonly">
                Signed in as
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="session-email-readonly"
                  value={email}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Signed in email (read only)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="session-status-readonly">
                Authentication status
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="session-status-readonly"
                  value={user ? 'Authenticated' : 'Not signed in'}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Authentication status (read only)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="session-last-login-readonly">
                Last sign in
              </label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="session-last-login-readonly"
                  value={loadingMeta ? 'Loading...' : lastSignIn ? formatDate(lastSignIn) : '—'}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Last sign in (read only)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="session-device-readonly">
                Current device
              </label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="session-device-readonly"
                  value={sessionInfo?.device ?? 'Detecting...'}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Current device (read only)"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <LoadingButton
              type="button"
              variant="destructive"
              loading={signingOut}
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* Account Details (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Mail className="h-5 w-5 text-primary" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email-readonly">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email-readonly"
                value={email}
                readOnly
                className="bg-muted/50 pl-10"
                aria-label="Email (read only)"
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="created-readonly">
                Account created
              </label>
              <div className="relative">
                <CalendarPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="created-readonly"
                  value={loadingMeta ? 'Loading...' : createdAt ? formatDate(createdAt) : '—'}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Account creation date (read only)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="last-login-readonly">
                Last login
              </label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="last-login-readonly"
                  value={loadingMeta ? 'Loading...' : lastSignIn ? formatDate(lastSignIn) : '—'}
                  readOnly
                  className="bg-muted/50 pl-10"
                  aria-label="Last login date (read only)"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
