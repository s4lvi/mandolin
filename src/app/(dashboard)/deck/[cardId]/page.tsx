"use client"

import { Suspense } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
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
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { CreateCardInput } from "@/lib/validations/card"

// Only allow same-origin relative paths as a return target
function safeReturnPath(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from
  return "/deck"
}

function EditCardContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const cardId = params.cardId as string
  const backPath = safeReturnPath(searchParams.get("from"))

  const { data: card, isLoading } = useCard(cardId)
  const updateCardMutation = useUpdateCard()
  const deleteCardMutation = useDeleteCard()

  const handleUpdate = async (data: CreateCardInput) => {
    try {
      await updateCardMutation.mutateAsync({ cardId, data })
      toast.success("Card updated")
      router.push(backPath)
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
      router.push(backPath)
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
              <Button variant="outline" onClick={() => router.push(backPath)}>
                Back
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
        <Button variant="ghost" size="icon" onClick={() => router.push(backPath)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Card</h1>
          <p className="text-muted-foreground">
            Update card details for &ldquo;{card.hanzi}&rdquo;
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="icon" aria-label="Delete card">
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
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
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
            onCancel={() => router.push(backPath)}
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

export default function EditCardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading card...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <EditCardContent />
    </Suspense>
  )
}
