"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Check } from "lucide-react"
import type { Changelog } from "@/types/api-responses"

interface WhatsNewModalProps {
  open: boolean
  changelog: Changelog | null
  onComplete: () => void
}

export function WhatsNewModal({ open, changelog, onComplete }: WhatsNewModalProps) {
  if (!changelog) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New in v{changelog.version}
          </DialogTitle>
          <DialogDescription>{changelog.title}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            {changelog.changes.map((change, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <p className="text-sm text-left flex-1">{change}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Released {new Date(changelog.releaseDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Got it!
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
