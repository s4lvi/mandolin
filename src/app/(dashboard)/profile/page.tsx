"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User, Lock, Loader2, SlidersHorizontal, BarChart3, Sparkles, ChevronRight } from "lucide-react"
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences"
import { toast } from "sonner"

// Profile update schema
const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional()
})

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

interface UserProfile {
  id: string
  email: string
  name: string | null
  bio: string | null
  createdAt: string
}

/** Debounced numeric preference field: saves on blur / Enter, clamps to range. */
function NumberPref({
  id,
  label,
  description,
  value,
  min,
  max,
  onSave
}: {
  id: string
  label: string
  description?: string
  value: number
  min: number
  max: number
  onSave: (n: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)

  const commit = () => {
    if (draft === null) return
    const n = Math.round(Number(draft))
    setDraft(null)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(max, Math.max(min, n))
    if (clamped !== value) onSave(clamped)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
        className="w-24 text-right"
      />
    </div>
  )
}

function StudySettingsCard() {
  const { data: prefs } = usePreferences()
  const update = useUpdatePreferences()
  const reviewPrefs = prefs?.reviewPrefs
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  const save = (input: Parameters<typeof update.mutate>[0]) =>
    update.mutate(input, {
      onError: (err: Error) => toast.error(err.message),
      onSuccess: () => toast.success("Saved")
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          <CardTitle>Study settings</CardTitle>
        </div>
        <CardDescription>
          Defaults for your daily goal and review sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <NumberPref
          id="daily-goal"
          label="Daily goal"
          description="Cards to review each day"
          value={prefs?.dailyGoal ?? 20}
          min={1}
          max={500}
          onSave={(n) => save({ dailyGoal: n })}
        />
        <NumberPref
          id="new-cards"
          label="New cards per session"
          description="Max never-reviewed cards introduced per review"
          value={reviewPrefs?.newCardsPerSession ?? 6}
          min={0}
          max={50}
          onSave={(n) => save({ reviewPrefs: { newCardsPerSession: n } })}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="show-hard">Show Hard button on mobile</Label>
            <p className="text-xs text-muted-foreground">Rate cards Again / Hard / Good / Easy on phones too</p>
          </div>
          <Switch
            id="show-hard"
            checked={reviewPrefs?.showHardButton ?? true}
            onCheckedChange={(v) => save({ reviewPrefs: { showHardButton: v } })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="autoplay">Auto-play audio</Label>
            <p className="text-xs text-muted-foreground">Play the hanzi pronunciation when a card appears</p>
          </div>
          <Switch
            id="autoplay"
            checked={reviewPrefs?.autoPlayAudio ?? true}
            onCheckedChange={(v) => save({ reviewPrefs: { autoPlayAudio: v } })}
          />
        </div>
        <Separator />
        <div className="text-sm">
          <p className="text-muted-foreground">Timezone</p>
          <p className="font-medium">
            {timezone}{" "}
            <span className="text-xs text-muted-foreground font-normal">(detected automatically)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [passwordFormVisible, setPasswordFormVisible] = useState(false)

  // Fetch user profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      if (!res.ok) throw new Error("Failed to fetch profile")
      const data = await res.json()
      return data.user as UserProfile
    }
  })

  // Profile update form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profileData?.name || "",
      bio: profileData?.bio || ""
    }
  })

  // Password change form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update profile")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      toast.success("Profile updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to change password")
      }
      return res.json()
    },
    onSuccess: () => {
      passwordForm.reset()
      setPasswordFormVisible(false)
      toast.success("Password changed successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleProfileUpdate = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data)
  }

  const handlePasswordChange = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            Update your name and bio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a bit about yourself..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description for your profile. Maximum 500 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-4 pt-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profileData?.email}</p>
                </div>
              </div>

              <Separator />

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Password</CardTitle>
          </div>
          <CardDescription>
            Change your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!passwordFormVisible ? (
            <Button
              variant="outline"
              onClick={() => setPasswordFormVisible(true)}
            >
              Change Password
            </Button>
          ) : (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Must be at least 8 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      passwordForm.reset()
                      setPasswordFormVisible(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Study settings */}
      <StudySettingsCard />

      {/* Links that left the mobile tab bar */}
      <Card>
        <CardContent className="p-0 divide-y">
          <Link href="/stats" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Stats</p>
              <p className="text-sm text-muted-foreground">Streaks, achievements & history</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/changelog" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">What&apos;s New</p>
              <p className="text-sm text-muted-foreground">Release notes and recent changes</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {profileData?.createdAt
                  ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono text-xs">{profileData?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
