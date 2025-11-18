"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateCard } from "@/hooks/use-cards"
import { CardForm } from "@/components/cards/card-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { CreateCardInput } from "@/lib/validations/card"

interface CardEntry {
  id: string
  data?: CreateCardInput
}

export default function AddCardsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<CardEntry[]>([{ id: "1" }])
  const [savedCards, setSavedCards] = useState<CreateCardInput[]>([])
  const createCardMutation = useCreateCard()

  const addEntry = () => {
    setEntries([...entries, { id: Date.now().toString() }])
  }

  const removeEntry = (id: string) => {
    if (entries.length === 1) return
    setEntries(entries.filter((e) => e.id !== id))
  }

  const handleCardSaved = async (data: CreateCardInput, entryId: string) => {
    try {
      await createCardMutation.mutateAsync(data)
      setSavedCards([...savedCards, data])
      toast.success(`Card "${data.hanzi}" saved`)

      // Remove the entry and add a new empty one if this was the last
      const remaining = entries.filter((e) => e.id !== entryId)
      if (remaining.length === 0) {
        setEntries([{ id: Date.now().toString() }])
      } else {
        setEntries(remaining)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save card"
      )
    }
  }

  const handleFinish = () => {
    if (savedCards.length > 0) {
      toast.success(`Added ${savedCards.length} card(s) to your deck`)
    }
    router.push("/deck")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Add Cards</h1>
          <p className="text-muted-foreground">
            Add new flashcards to your deck
          </p>
        </div>
        {savedCards.length > 0 && (
          <Button onClick={handleFinish}>
            Done ({savedCards.length} saved)
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card key={entry.id}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Card {index + 1}</CardTitle>
                {entries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardForm
                onSubmit={(data) => handleCardSaved(data, entry.id)}
                isLoading={createCardMutation.isPending}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={addEntry} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Card
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/deck")}>
          Cancel
        </Button>
        <Button onClick={handleFinish} disabled={savedCards.length === 0}>
          Finish ({savedCards.length} saved)
        </Button>
      </div>
    </div>
  )
}
