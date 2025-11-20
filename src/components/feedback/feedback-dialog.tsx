"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Bug, Lightbulb, MessageSquare } from "lucide-react"

const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  email: z.string().email("Invalid email").or(z.literal(""))
})

type FeedbackForm = z.infer<typeof feedbackSchema>

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "GENERAL",
      message: "",
      email: ""
    }
  })

  const feedbackType = watch("type")

  const onSubmit = async (data: FeedbackForm) => {
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to submit feedback")
      }

      toast.success("Thank you for your feedback!")
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  const typeOptions = [
    {
      value: "BUG",
      label: "Bug Report",
      icon: Bug,
      description: "Report a bug or issue"
    },
    {
      value: "FEATURE",
      label: "Feature Request",
      icon: Lightbulb,
      description: "Suggest a new feature"
    },
    {
      value: "GENERAL",
      label: "General Feedback",
      icon: MessageSquare,
      description: "Share your thoughts"
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your feedback, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={feedbackType}
              onValueChange={(value) => setValue("type", value as FeedbackForm["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Tell us more..."
              rows={5}
              className={errors.message ? "border-red-500" : ""}
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="your@email.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave your email if you'd like us to follow up
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
