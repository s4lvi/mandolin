"use client"

import { useState } from "react"
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
import { User, Lock, CreditCard, Loader2 } from "lucide-react"
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
        <h1 className="text-3xl font-bold">Account Settings</h1>
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

      {/* Subscription (Placeholder) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-2">
              Subscription features coming soon!
            </p>
            <p className="text-sm text-muted-foreground">
              We're working on bringing you premium features and subscription plans.
            </p>
          </div>
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
