"use client"

import { useRouter, useParams } from "next/navigation"
import { useCard, useUpdateCard, useDeleteCard } from "@/hooks/use-cards"
import { CardForm } from "@/components/cards/card-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { CreateCardInput } from "@/lib/validations/card"

export default function EditCardPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.cardId as string

  const { data: card, isLoading } = useCard(cardId)
  const updateCardMutation = useUpdateCard()
  const deleteCardMutation = useDeleteCard()

  const handleUpdate = async (data: CreateCardInput) => {
    try {
      await updateCardMutation.mutateAsync({ cardId, data })
      toast.success("Card updated")
      router.push("/deck")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update card"
      )
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCardMutation.mutateAsync(cardId)
      toast.success("Card deleted")
      router.push("/deck")
    } catch {
      toast.error("Failed to delete card")
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading card...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Card not found</p>
            <div className="text-center mt-4">
              <Button variant="outline" onClick={() => router.push("/deck")}>
                Back to Deck
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deck")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Edit Card</h1>
          <p className="text-muted-foreground">
            Update card details for &ldquo;{card.hanzi}&rdquo;
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Card</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;{card.hanzi}&rdquo;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCardMutation.isPending}
              >
                {deleteCardMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Card Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CardForm
            initialData={card}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/deck")}
            isLoading={updateCardMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Correct</p>
              <p className="font-medium">{card.correctCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Incorrect</p>
              <p className="font-medium">{card.incorrectCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Reviewed</p>
              <p className="font-medium">
                {card.lastReviewed
                  ? new Date(card.lastReviewed).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(card.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
