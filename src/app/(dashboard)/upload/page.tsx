"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParseNotes } from "@/hooks/use-upload"
import { useCreateCardsBulk } from "@/hooks/use-cards"
import { useLessons, useCreateLesson, useUpdateLesson } from "@/hooks/use-lessons"
import { getNextLessonNumber } from "@/lib/lesson-helpers"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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

interface ParsedCardWithDuplicate extends ParsedCard {
  isDuplicate: boolean
  selected: boolean
}

export default function UploadPage() {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [lessonMode, setLessonMode] = useState<"new" | "existing" | "none">("new")
  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [lessonNumber, setLessonNumber] = useState("")
  const [lessonTitle, setLessonTitle] = useState("")
  const [parsedCards, setParsedCards] = useState<ParsedCardWithDuplicate[]>([])
  const [generatedLessonContext, setGeneratedLessonContext] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const parseNotesMutation = useParseNotes()
  const createCardsMutation = useCreateCardsBulk()
  const createLessonMutation = useCreateLesson()
  const updateLessonMutation = useUpdateLesson()
  const { data: lessons } = useLessons()

  // Set default lesson number when component mounts or lessons load
  useEffect(() => {
    if (lessons && lessonNumber === "") {
      const nextNumber = getNextLessonNumber(lessons)
      setLessonNumber(nextNumber.toString())
    }
    // Set first lesson as default for "existing" mode
    if (lessons && Array.isArray(lessons) && lessons.length > 0 && selectedLessonId === "") {
      setSelectedLessonId(lessons[0].id)
    }
  }, [lessons, lessonNumber, selectedLessonId])

  const handleParse = async () => {
    if (!notes.trim()) {
      toast.error("Please enter some notes to parse")
      return
    }

    // Validate lesson selection
    if (lessonMode === "new" && !lessonNumber) {
      toast.error("Please enter a lesson number")
      return
    }
    if (lessonMode === "existing" && !selectedLessonId) {
      toast.error("Please select a lesson")
      return
    }

    try {
      const result = await parseNotesMutation.mutateAsync({
        notes,
        lessonNumber: lessonNumber ? parseInt(lessonNumber) : undefined,
        lessonTitle: lessonTitle || undefined,
        lessonMode,
        selectedLessonId: lessonMode === "existing" ? selectedLessonId : undefined
      })

      setParsedCards(
        result.cards.map((card) => ({
          ...card,
          selected: !card.isDuplicate  // Only select new cards, deselect duplicates
        }))
      )

      // Store generated lesson context
      if (result.lessonContext) {
        setGeneratedLessonContext(result.lessonContext)
      }

      setShowPreview(true)

      if (result.duplicatesFound > 0 && lessonMode !== "none") {
        toast.info(
          `Found ${result.duplicatesFound} duplicate card(s) - will be associated with the lesson (not created again)`
        )
      } else if (result.duplicatesFound > 0) {
        toast.info(
          `Found ${result.duplicatesFound} duplicate card(s) - these already exist and won't be created again`
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
    const newCards = parsedCards
      .filter((card) => card.selected && !card.isDuplicate)
      .map((card) => ({
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        notes: card.notes,
        type: card.type as CardType,
        tags: card.suggestedTags
      }))

    // Associate ALL duplicate cards with lesson (regardless of selection)
    const duplicateCards = parsedCards
      .filter((card) => card.isDuplicate)

    const totalToProcess = newCards.length + (lessonMode !== "none" ? duplicateCards.length : 0)

    if (totalToProcess === 0) {
      toast.error("No cards to save")
      return
    }

    try {
      let finalLessonId: string | undefined = undefined

      // Handle lesson creation or update based on lesson mode
      if (lessonMode === "new") {
        // Create new lesson with generated context
        const lesson = await createLessonMutation.mutateAsync({
          number: parseInt(lessonNumber),
          title: lessonTitle || undefined,
          notes: generatedLessonContext || undefined
        })
        finalLessonId = lesson.id
        toast.success(`Created Lesson ${lesson.number}`)
      } else if (lessonMode === "existing") {
        // Update existing lesson's notes with generated context
        if (selectedLessonId && generatedLessonContext && lessons && Array.isArray(lessons)) {
          const lesson = lessons.find((l) => l.id === selectedLessonId)

          // Append new context to existing notes
          const updatedNotes = lesson?.notes
            ? `${lesson.notes}\n\n---\n\n${generatedLessonContext}`
            : generatedLessonContext

          await updateLessonMutation.mutateAsync({
            lessonId: selectedLessonId,
            data: { notes: updatedNotes }
          })

          toast.success(`Updated lesson context`)
        }
        finalLessonId = selectedLessonId
      }

      let createdCount = 0
      let associatedCount = 0

      // Create new cards with lesson association
      if (newCards.length > 0) {
        const result = await createCardsMutation.mutateAsync({
          cards: newCards,
          lessonId: finalLessonId
        })
        createdCount = result.created
      }

      // Associate existing duplicate cards with the lesson
      if (duplicateCards.length > 0 && finalLessonId) {
        try {
          // Fetch existing cards by hanzi to get their IDs
          const response = await fetch("/api/cards")
          if (!response.ok) {
            throw new Error("Failed to fetch cards for duplicate checking")
          }
          const allCards = await response.json()

          const duplicateHanzi = new Set(duplicateCards.map(c => c.hanzi))
          const existingCardIds = allCards.cards
            .filter((c: any) => duplicateHanzi.has(c.hanzi))
            .map((c: any) => c.id)

          if (existingCardIds.length > 0) {
            const associateResponse = await fetch("/api/cards/associate-lesson", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cardIds: existingCardIds,
                lessonId: finalLessonId,
                mode: "move"  // Use 'move' to reassign cards even if they're already in another lesson
              })
            })

            if (!associateResponse.ok) {
              const errorData = await associateResponse.json()
              throw new Error(errorData.error || "Failed to associate duplicate cards")
            }

            const associateResult = await associateResponse.json()
            associatedCount = associateResult.updatedCount
          }
        } catch (error) {
          console.error("Error associating duplicate cards:", error)
          toast.warning(
            error instanceof Error
              ? `Some duplicate cards may not be associated: ${error.message}`
              : "Some duplicate cards may not be associated with the lesson"
          )
        }
      }

      // Show comprehensive success message
      const messages = []
      if (createdCount > 0) messages.push(`${createdCount} new card${createdCount !== 1 ? 's' : ''}`)
      if (associatedCount > 0) messages.push(`${associatedCount} existing card${associatedCount !== 1 ? 's' : ''}`)

      if (messages.length > 0) {
        const action = finalLessonId ? 'added to lesson' : 'created'
        toast.success(`${messages.join(' and ')} ${action}`)
      }

      // Redirect to lesson detail if lesson was created, otherwise to deck
      if (finalLessonId) {
        router.push(`/lessons/${finalLessonId}`)
      } else {
        router.push("/deck")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save cards"
      )
    }
  }

  const selectedNewCards = parsedCards.filter((c) => c.selected && !c.isDuplicate).length
  const duplicateCards = parsedCards.filter((c) => c.isDuplicate).length
  const totalNewCards = parsedCards.filter((c) => !c.isDuplicate).length

  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Review Parsed Cards</h1>
            <p className="text-muted-foreground">
              {selectedNewCards} of {totalNewCards} new card{totalNewCards !== 1 ? 's' : ''} selected to save
              {duplicateCards > 0 && lessonMode !== "none" && ` • ${duplicateCards} duplicate${duplicateCards !== 1 ? 's' : ''} will be associated with lesson`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button
              onClick={handleSaveCards}
              disabled={createCardsMutation.isPending || selectedNewCards === 0}
            >
              {createCardsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${selectedNewCards} Card${selectedNewCards !== 1 ? 's' : ''}${duplicateCards > 0 && lessonMode !== "none" ? ` + ${duplicateCards} Duplicate${duplicateCards !== 1 ? 's' : ''}` : ''}`
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {parsedCards.map((card, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                card.selected
                  ? "ring-2 ring-primary"
                  : card.isDuplicate
                    ? "opacity-60 bg-muted"
                    : "opacity-70"
              }`}
              onClick={() => toggleCard(index)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {card.selected ? (
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
                          Already exists{lessonMode !== "none" ? " (will link to lesson)" : ""}
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
          <CardTitle>Lesson Selection</CardTitle>
          <CardDescription>
            Choose whether to create a new lesson, add to an existing one, or just create cards without a lesson.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Lesson Mode</Label>
            <RadioGroup value={lessonMode} onValueChange={(value) => setLessonMode(value as "new" | "existing" | "none")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal cursor-pointer">
                  Create New Lesson
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">
                  Add to Existing Lesson
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  No Lesson (Cards Only)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {lessonMode === "new" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lessonNumber">
                  Lesson Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lessonNumber"
                  type="number"
                  placeholder="e.g., 1"
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessonTitle">Lesson Title (Optional)</Label>
                <Input
                  id="lessonTitle"
                  placeholder="e.g., Greetings"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>
            </div>
          )}

          {lessonMode === "existing" && (
            <div className="space-y-2">
              <Label htmlFor="existingLesson">
                Select Lesson <span className="text-destructive">*</span>
              </Label>
              {lessons && Array.isArray(lessons) && lessons.length > 0 ? (
                <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                  <SelectTrigger id="existingLesson">
                    <SelectValue placeholder="Choose a lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        Lesson {lesson.number}
                        {lesson.title && `: ${lesson.title}`}
                        {lesson._count && ` (${lesson._count.cards} cards)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No existing lessons. Create a new lesson instead.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            💡 Tip: When you parse notes with a lesson selected, AI will generate both flashcards and a lesson context summary for interactive lessons.
          </p>
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
    </div>
    </ErrorBoundary>
  )
}
