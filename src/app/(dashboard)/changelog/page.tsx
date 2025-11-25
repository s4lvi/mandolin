"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Check, Loader2, Sparkles } from "lucide-react"

interface Changelog {
  id: string
  version: string
  title: string
  changes: string[]
  releaseDate: string
  createdAt: string
}

export default function ChangelogPage() {
  const { data: changelogsData, isLoading } = useQuery({
    queryKey: ["changelog-history"],
    queryFn: async () => {
      const res = await fetch("/api/changelog/history")
      if (!res.ok) throw new Error("Failed to fetch changelogs")
      const data = await res.json()
      return data.changelogs as Changelog[]
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">What's New</h1>
          <p className="text-muted-foreground">
            Version history and feature updates
          </p>
        </div>
      </div>

      {!changelogsData || changelogsData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No changelogs available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {changelogsData.map((changelog, index) => (
            <Card key={changelog.id} className="relative overflow-hidden">
              {index === 0 && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary/10 to-transparent w-32 h-full" />
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{changelog.version}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{changelog.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(changelog.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {changelog.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <p className="text-sm flex-1">{change}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center pt-8 pb-4">
        <p className="text-sm text-muted-foreground">
          Have suggestions for new features?{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => {
              // Trigger feedback modal if available
              const feedbackButton = document.querySelector('[data-feedback-button]') as HTMLButtonElement
              if (feedbackButton) {
                feedbackButton.click()
              }
            }}
          >
            Send us feedback
          </button>
        </p>
      </div>
    </div>
  )
}
