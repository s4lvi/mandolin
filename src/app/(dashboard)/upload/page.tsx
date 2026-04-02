"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParseNotes } from "@/hooks/use-upload"
import { useLessons } from "@/hooks/use-lessons"
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
import { Upload, Check, X } from "lucide-react"
import { AILoading } from "@/components/ui/ai-loading"
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
  const [isSaving, setIsSaving] = useState(false)

  const { parseStatus, ...parseNotesMutation } = useParseNotes()
  const { data: lessons } = useLessons()

  // Warn user before navigating away during AI parsing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (parseNotesMutation.isPending) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [parseNotesMutation.isPending])

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

  const handleSaveCards = () => {
    if (isSaving) return
    setIsSaving(true)

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

    const duplicateHanzi = parsedCards
      .filter((card) => card.isDuplicate)
      .map((card) => card.hanzi)

    const totalToProcess = newCards.length + (lessonMode !== "none" ? duplicateHanzi.length : 0)

    if (totalToProcess === 0) {
      toast.error("No cards to save")
      setIsSaving(false)
      return
    }

    // Fire the save to the server — this runs server-side even if we navigate away
    fetch("/api/cards/save-parsed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cards: newCards,
        duplicateHanzi: lessonMode !== "none" ? duplicateHanzi : [],
        lessonMode,
        lessonNumber: lessonNumber ? parseInt(lessonNumber) : undefined,
        lessonTitle: lessonTitle || undefined,
        lessonContext: generatedLessonContext || undefined,
        existingLessonId: lessonMode === "existing" ? selectedLessonId : undefined
      }),
      // keepalive ensures the request completes even if the page navigates away
      keepalive: true
    }).catch((err) => {
      console.error("Save request failed:", err)
      toast.error("Some cards may not have saved — check your deck", { duration: 8000 })
    })

    // Redirect immediately
    const destination = lessonMode === "existing"
      ? `/lessons/${selectedLessonId}`
      : lessonMode === "new"
        ? "/lessons"
        : "/deck"

    toast.success(
      `Saving ${newCards.length} card${newCards.length !== 1 ? "s" : ""}...`,
      { description: "Cards will appear in your deck shortly", duration: 5000 }
    )
    router.push(destination)
  }

  const selectedNewCards = parsedCards.filter((c) => c.selected && !c.isDuplicate).length
  const duplicateCards = parsedCards.filter((c) => c.isDuplicate).length
  const totalNewCards = parsedCards.filter((c) => !c.isDuplicate).length

  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Review Parsed Cards</h1>
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
              disabled={isSaving || selectedNewCards === 0}
            >
              {`Save ${selectedNewCards} Card${selectedNewCards !== 1 ? 's' : ''}${duplicateCards > 0 && lessonMode !== "none" ? ` + ${duplicateCards} Duplicate${duplicateCards !== 1 ? 's' : ''}` : ''}`}
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
        <h1 className="text-2xl sm:text-3xl font-bold">Upload Lesson Notes</h1>
        <p className="text-muted-foreground">
          Paste your lesson notes and let AI create flashcards automatically
        </p>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${!showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
          <div className="h-px flex-1 bg-border" />
          <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold bg-muted text-muted-foreground">3</div>
        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            className="min-h-[180px] md:min-h-[300px] font-mono text-sm"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Separator />
          {parseNotesMutation.isPending ? (
            <AILoading
              status={parseStatus}
              statusLabels={{
                generating_context: "Generating lesson context",
                parsing_cards: "Extracting flashcards from your notes",
                streaming: "AI is building your cards",
              }}
            />
          ) : (
          <Button
            onClick={handleParse}
            disabled={!notes.trim()}
            className="w-full"
          >
              <>
                <Upload className="h-4 w-4 mr-2" />
                Parse Notes
              </>
          </Button>
          )}
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  )
}
