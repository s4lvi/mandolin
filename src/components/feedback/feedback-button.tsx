"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeedbackDialog } from "./feedback-dialog"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        aria-label="Send feedback"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
