"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Card } from "@/types"
import type { CreateCardInput, CreateCardsBulkResponse } from "@/types/api-responses"

interface FetchCardsParams {
  lessonId?: string
  type?: string
  tag?: string
}

async function fetchCards(params?: FetchCardsParams): Promise<Card[]> {
  const searchParams = new URLSearchParams()
  if (params?.lessonId) searchParams.set("lessonId", params.lessonId)
  if (params?.type) searchParams.set("type", params.type)
  if (params?.tag) searchParams.set("tag", params.tag)

  const url = `/api/cards${searchParams.toString() ? `?${searchParams}` : ""}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error("Failed to fetch cards")
  }

  const data = await res.json()
  return data.cards
}

async function fetchCard(cardId: string): Promise<Card> {
  const res = await fetch(`/api/cards/${cardId}`)

  if (!res.ok) {
    throw new Error("Failed to fetch card")
  }

  const data = await res.json()
  return data.card
}

async function createCard(input: CreateCardInput): Promise<Card> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create card")
  }

  const data = await res.json()
  return data.card
}

async function createCardsBulk(
  input: CreateCardInput[],
  lessonId?: string
): Promise<CreateCardsBulkResponse> {
  const res = await fetch("/api/cards/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards: input, lessonId })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create cards")
  }

  return res.json()
}

async function updateCard(
  cardId: string,
  input: Partial<CreateCardInput>
): Promise<Card> {
  const res = await fetch(`/api/cards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update card")
  }

  const data = await res.json()
  return data.card
}

async function deleteCard(cardId: string): Promise<void> {
  const res = await fetch(`/api/cards/${cardId}`, {
    method: "DELETE"
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete card")
  }
}

export function useCards(params?: FetchCardsParams) {
  return useQuery({
    queryKey: ["cards", params],
    queryFn: () => fetchCards(params)
  })
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ["cards", cardId],
    queryFn: () => fetchCard(cardId),
    enabled: !!cardId
  })
}

export function useCreateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

export function useCreateCardsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cards,
      lessonId
    }: {
      cards: CreateCardInput[]
      lessonId?: string
    }) => createCardsBulk(cards, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

export function useUpdateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cardId,
      data
    }: {
      cardId: string
      data: Partial<CreateCardInput>
    }) => updateCard(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

export function useDeleteCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}
