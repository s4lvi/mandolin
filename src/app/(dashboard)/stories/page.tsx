"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Volume2, BookOpen, Eye, EyeOff, RotateCcw } from "lucide-react"
import { speakChinese } from "@/lib/speech"
import { toast } from "sonner"
import type { StoryDisplayMode } from "@/types"

interface StorySentence {
  hanzi: string
  pinyin: string
  english: string
  newWords?: string[]
}

interface Story {
  title: string
  titlePinyin: string
  titleEnglish: string
  sentences: StorySentence[]
}

function SentenceDisplay({
  sentence,
  displayMode
}: {
  sentence: StorySentence
  displayMode: StoryDisplayMode
}) {
  const [showPinyin, setShowPinyin] = useState(displayMode === "hanzi_pinyin_audio")
  const [showEnglish, setShowEnglish] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const playAudio = async () => {
    if (isPlaying) return
    setIsPlaying(true)
    await speakChinese(
      sentence.hanzi,
      undefined,
      () => setIsPlaying(false),
      () => setIsPlaying(false)
    )
  }

  return (
    <div className="group py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 mt-1"
          onClick={playAudio}
          disabled={isPlaying}
        >
          <Volume2 className={`h-4 w-4 ${isPlaying ? "animate-pulse text-primary" : ""}`} />
        </Button>

        <div className="flex-1 min-w-0">
          {/* Hanzi — always shown */}
          <p className="text-xl leading-relaxed break-words">{sentence.hanzi}</p>

          {/* Pinyin — shown or tap-to-reveal */}
          {showPinyin ? (
            <p className="text-sm text-muted-foreground mt-1 break-words">{sentence.pinyin}</p>
          ) : (
            <button
              className="text-xs text-primary/50 hover:text-primary mt-1"
              onClick={() => setShowPinyin(true)}
            >
              show pinyin
            </button>
          )}

          {/* English — always tap-to-reveal */}
          {showEnglish ? (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 break-words">{sentence.english}</p>
          ) : (
            <button
              className="text-xs text-blue-500/50 hover:text-blue-500 mt-1"
              onClick={() => setShowEnglish(true)}
            >
              show translation
            </button>
          )}

          {/* New words indicator */}
          {sentence.newWords && sentence.newWords.length > 0 && (
            <div className="flex gap-1 mt-2">
              {sentence.newWords.map((word) => (
                <Badge key={word} variant="secondary" className="text-xs">
                  new: {word}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StoriesPage() {
  const [story, setStory] = useState<Story | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [displayMode, setDisplayMode] = useState<StoryDisplayMode>("hanzi_audio")
  const [isPlayingAll, setIsPlayingAll] = useState(false)

  const generateStory = async () => {
    setIsGenerating(true)
    setStory(null)
    try {
      const res = await fetch("/api/stories/generate", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate story")
      }
      const data = await res.json()
      setStory(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate story")
    } finally {
      setIsGenerating(false)
    }
  }

  const playAllSentences = async () => {
    if (!story || isPlayingAll) return
    setIsPlayingAll(true)

    for (const sentence of story.sentences) {
      await new Promise<void>((resolve) => {
        speakChinese(
          sentence.hanzi,
          undefined,
          () => resolve(),
          () => resolve()
        )
      })
      // Small pause between sentences
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsPlayingAll(false)
  }

  if (!story) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Short Stories</h1>
          <p className="text-muted-foreground">
            AI-generated reading practice using your vocabulary
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate a Story</CardTitle>
            <CardDescription>
              The AI will write a short story using words from your deck
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display Mode</Label>
              <Select
                value={displayMode}
                onValueChange={(v) => setDisplayMode(v as StoryDisplayMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hanzi_audio">
                    Immersion (Hanzi + Audio only)
                  </SelectItem>
                  <SelectItem value="hanzi_pinyin_audio">
                    With Pinyin (Hanzi + Pinyin + Audio)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {displayMode === "hanzi_audio"
                  ? "Pinyin and translations are hidden — tap to reveal. Best for building character recognition."
                  : "Pinyin is shown by default. Translations still tap-to-reveal."}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={generateStory}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating story...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{story.title}</h1>
          {displayMode === "hanzi_pinyin_audio" && (
            <p className="text-muted-foreground">{story.titlePinyin}</p>
          )}
          <p className="text-sm text-muted-foreground">{story.titleEnglish}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={playAllSentences}
            disabled={isPlayingAll}
          >
            <Volume2 className={`h-4 w-4 mr-1 ${isPlayingAll ? "animate-pulse" : ""}`} />
            {isPlayingAll ? "Playing..." : "Read Aloud"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStory(null)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            New Story
          </Button>
        </div>
      </div>

      {/* Display mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={displayMode === "hanzi_audio" ? "default" : "outline"}
          size="sm"
          onClick={() => setDisplayMode("hanzi_audio")}
        >
          <EyeOff className="h-3 w-3 mr-1" />
          Immersion
        </Button>
        <Button
          variant={displayMode === "hanzi_pinyin_audio" ? "default" : "outline"}
          size="sm"
          onClick={() => setDisplayMode("hanzi_pinyin_audio")}
        >
          <Eye className="h-3 w-3 mr-1" />
          With Pinyin
        </Button>
      </div>

      {/* Sentences */}
      <Card>
        <CardContent className="py-4 divide-y">
          {story.sentences.map((sentence, index) => (
            <SentenceDisplay
              key={index}
              sentence={sentence}
              displayMode={displayMode}
            />
          ))}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="text-center text-sm text-muted-foreground">
        {story.sentences.length} sentences
        {story.sentences.some(s => s.newWords && s.newWords.length > 0) && (
          <> with {story.sentences.reduce((acc, s) => acc + (s.newWords?.length || 0), 0)} new words</>
        )}
      </div>
    </div>
  )
}
