"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useParseNotes } from "@/hooks/use-upload"
import { useCreateCardsBulk } from "@/hooks/use-cards"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, Loader2, Check, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { ParsedCard, CardType } from "@/types"
import { LessonAssociationModal } from "@/components/lessons/lesson-association-modal"

interface ParsedCardWithDuplicate extends ParsedCard {
  isDuplicate: boolean
  selected: boolean
}

export default function UploadPage() {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [lessonNumber, setLessonNumber] = useState("")
  const [lessonTitle, setLessonTitle] = useState("")
  const [parsedCards, setParsedCards] = useState<ParsedCardWithDuplicate[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [createdCardIds, setCreatedCardIds] = useState<string[]>([])
  const [createdCardCount, setCreatedCardCount] = useState(0)

  const parseNotesMutation = useParseNotes()
  const createCardsMutation = useCreateCardsBulk()

  const handleParse = async () => {
    if (!notes.trim()) {
      toast.error("Please enter some notes to parse")
      return
    }

    try {
      const result = await parseNotesMutation.mutateAsync({
        notes,
        lessonNumber: lessonNumber ? parseInt(lessonNumber) : undefined,
        lessonTitle: lessonTitle || undefined
      })

      setParsedCards(
        result.cards.map((card) => ({
          ...card,
          selected: !card.isDuplicate
        }))
      )
      setShowPreview(true)

      if (result.duplicatesFound > 0) {
        toast.info(
          `Found ${result.duplicatesFound} duplicate(s) that will be skipped`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to parse notes"
      )
    }
  }

  const toggleCard = (index: number) => {
    setParsedCards((cards) =>
      cards.map((card, i) =>
        i === index ? { ...card, selected: !card.selected } : card
      )
    )
  }

  const handleSaveCards = async () => {
    const selectedCards = parsedCards
      .filter((card) => card.selected && !card.isDuplicate)
      .map((card) => ({
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        notes: card.notes,
        type: card.type as CardType,
        tags: card.suggestedTags
      }))

    if (selectedCards.length === 0) {
      toast.error("No cards selected to save")
      return
    }

    try {
      const result = await createCardsMutation.mutateAsync({
        cards: selectedCards
      })

      toast.success(`Created ${result.created} cards successfully`)

      // Store created card IDs and show lesson association modal
      setCreatedCardIds(result.cardIds || [])
      setCreatedCardCount(result.created)
      setShowLessonModal(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save cards"
      )
    }
  }

  const handleLessonModalClose = () => {
    setShowLessonModal(false)
    // Redirect to deck page after modal closes
    router.push("/deck")
  }

  const handleLessonAssociationSuccess = (lessonId: string, lessonTitle: string) => {
    // Optional: redirect to lesson detail page instead of deck
    // router.push(`/lessons/${lessonId}`)
    setShowLessonModal(false)
    router.push("/deck")
  }

  const selectedCount = parsedCards.filter(
    (c) => c.selected && !c.isDuplicate
  ).length

  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Review Parsed Cards</h1>
            <p className="text-muted-foreground">
              {selectedCount} of {parsedCards.length} cards selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button
              onClick={handleSaveCards}
              disabled={createCardsMutation.isPending || selectedCount === 0}
            >
              {createCardsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${selectedCount} Cards`
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {parsedCards.map((card, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                card.isDuplicate
                  ? "opacity-50 bg-muted"
                  : card.selected
                    ? "ring-2 ring-primary"
                    : "opacity-70"
              }`}
              onClick={() => !card.isDuplicate && toggleCard(index)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {card.isDuplicate ? (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    ) : card.selected ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold">{card.hanzi}</span>
                      <span className="text-sm text-muted-foreground">
                        {card.pinyin}
                      </span>
                      {card.isDuplicate && (
                        <Badge variant="secondary" className="text-xs">
                          Duplicate
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mb-2">{card.english}</p>
                    {card.notes && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {card.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {card.type.toLowerCase()}
                      </Badge>
                      {card.suggestedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Lesson Notes</h1>
        <p className="text-muted-foreground">
          Paste your lesson notes and let AI create flashcards automatically
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Information</CardTitle>
          <CardDescription>
            Optional: Add lesson details to use after card creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lessonNumber">Lesson Number</Label>
              <Input
                id="lessonNumber"
                type="number"
                placeholder="e.g., 5"
                value={lessonNumber}
                onChange={(e) => setLessonNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">Lesson Title</Label>
              <Input
                id="lessonTitle"
                placeholder="e.g., Asking for Directions"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Notes</CardTitle>
          <CardDescription>
            Paste your notes including vocabulary, grammar points, and phrases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Example:
Vocabulary:
- 在哪儿 (zài nǎr) - where
- 左边 (zuǒbian) - left side

Grammar:
1. 在 + place - indicates location
   Example: 银行在学校对面

Phrases:
- 请问，...在哪儿？- Excuse me, where is...?`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <Separator />
          <Button
            onClick={handleParse}
            disabled={parseNotesMutation.isPending || !notes.trim()}
            className="w-full"
          >
            {parseNotesMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing with AI...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Parse Notes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lesson Association Modal */}
      <LessonAssociationModal
        open={showLessonModal}
        onClose={handleLessonModalClose}
        cardIds={createdCardIds}
        cardCount={createdCardCount}
        onSuccess={handleLessonAssociationSuccess}
        defaultLessonNumber={lessonNumber ? parseInt(lessonNumber) : undefined}
        defaultLessonTitle={lessonTitle}
      />
    </div>
    </ErrorBoundary>
  )
}
