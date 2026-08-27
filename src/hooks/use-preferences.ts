"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DEFAULT_REVIEW_PREFS,
  type PreferencesResponse,
  type UpdatePreferencesInput
} from "@/lib/validations/preferences"

export const PREFERENCES_KEY = ["preferences"] as const

async function fetchPreferences(): Promise<PreferencesResponse> {
  const res = await fetch("/api/user/preferences")
  if (!res.ok) throw new Error("Failed to load preferences")
  return res.json()
}

async function putPreferences(input: UpdatePreferencesInput): Promise<PreferencesResponse> {
  const res = await fetch("/api/user/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to save preferences")
  }
  return res.json()
}

/** Persisted user preferences (review defaults + daily goal). */
export function usePreferences() {
  return useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: fetchPreferences,
    staleTime: 5 * 60 * 1000,
    placeholderData: { reviewPrefs: DEFAULT_REVIEW_PREFS, dailyGoal: 20, timezone: null }
  })
}

/** Partial update; optimistic so the UI never waits on the round trip. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: putPreferences,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY })
      const previous = queryClient.getQueryData<PreferencesResponse>(PREFERENCES_KEY)
      if (previous) {
        queryClient.setQueryData<PreferencesResponse>(PREFERENCES_KEY, {
          ...previous,
          reviewPrefs: { ...previous.reviewPrefs, ...(input.reviewPrefs ?? {}) },
          dailyGoal: input.dailyGoal ?? previous.dailyGoal
        })
      }
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PREFERENCES_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY })
      queryClient.invalidateQueries({ queryKey: ["user-stats"] })
    }
  })
}
