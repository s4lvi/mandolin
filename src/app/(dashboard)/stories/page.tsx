"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Loader2, Volume2, BookOpen, Eye, EyeOff, RotateCcw, Trash2, Clock } from "lucide-react"
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
  id?: string
  title: string
  titlePinyin: string
  titleEnglish: string
  sentences: StorySentence[]
  createdAt?: string
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
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [displayMode, setDisplayMode] = useState<StoryDisplayMode>("hanzi_audio")
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const queryClient = useQueryClient()

  const { data: savedStoriesData, isLoading: isLoadingStories } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await fetch("/api/stories")
      if (!res.ok) throw new Error("Failed to fetch stories")
      return res.json()
    }
  })

  const savedStories: Story[] = savedStoriesData?.stories || []

  const generateStory = async () => {
    setIsGenerating(true)
    setActiveStory(null)
    try {
      const res = await fetch("/api/stories/generate", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate story")
      }
      const data = await res.json()
      setActiveStory(data)
      queryClient.invalidateQueries({ queryKey: ["stories"] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate story")
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteStory = async (storyId: string) => {
    try {
      const res = await fetch(`/api/stories?id=${storyId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete story")
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      if (activeStory?.id === storyId) setActiveStory(null)
      toast.success("Story deleted")
    } catch {
      toast.error("Failed to delete story")
    }
  }

  const playAllSentences = async () => {
    if (!activeStory || isPlayingAll) return
    setIsPlayingAll(true)

    for (const sentence of activeStory.sentences) {
      await new Promise<void>((resolve) => {
        speakChinese(
          sentence.hanzi,
          undefined,
          () => resolve(),
          () => resolve()
        )
      })
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsPlayingAll(false)
  }

  // Reading view for an active story
  if (activeStory) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{activeStory.title}</h1>
            {displayMode === "hanzi_pinyin_audio" && (
              <p className="text-muted-foreground">{activeStory.titlePinyin}</p>
            )}
            <p className="text-sm text-muted-foreground">{activeStory.titleEnglish}</p>
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
              onClick={() => setActiveStory(null)}
            >
              Back
            </Button>
          </div>
        </div>

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

        <Card>
          <CardContent className="py-4 divide-y">
            {activeStory.sentences.map((sentence, index) => (
              <SentenceDisplay
                key={index}
                sentence={sentence}
                displayMode={displayMode}
              />
            ))}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          {activeStory.sentences.length} sentences
          {activeStory.sentences.some(s => s.newWords && s.newWords.length > 0) && (
            <> with {activeStory.sentences.reduce((acc, s) => acc + (s.newWords?.length || 0), 0)} new words</>
          )}
        </div>
      </div>
    )
  }

  // Stories list view
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Short Stories</h1>
          <p className="text-muted-foreground">
            AI-generated reading practice using your vocabulary
          </p>
        </div>
        <Button
          onClick={generateStory}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4 mr-2" />
              New Story
            </>
          )}
        </Button>
      </div>

      {/* Display mode selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Reading mode:</span>
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

      {/* Saved stories */}
      {isLoadingStories ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : savedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No stories yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first story to start reading practice
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedStories.map((story) => (
            <Card
              key={story.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setActiveStory(story)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold truncate">{story.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{story.titleEnglish}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(story.createdAt!).toLocaleDateString()}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {(story.sentences as StorySentence[]).length} sentences
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteStory(story.id!)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
