"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Wand2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createCardSchema, type CreateCardInput } from "@/lib/validations/card"
import type { Card } from "@/types"

type AutofillField = "hanzi" | "pinyin" | "english" | "notes" | "type"

interface CardFormProps {
  initialData?: Card
  onSubmit: (data: CreateCardInput) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function CardForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading
}: CardFormProps) {
  const [autofillLoading, setAutofillLoading] = useState<AutofillField | null>(null)

  const form = useForm<CreateCardInput>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      hanzi: initialData?.hanzi || "",
      pinyin: initialData?.pinyin || "",
      english: initialData?.english || "",
      notes: initialData?.notes || "",
      type: initialData?.type || "VOCABULARY",
      tags: initialData?.tags.map((t) => t.tag.name) || []
    }
  })

  // Watch form values to reactively show/hide autofill buttons
  const watchedValues = form.watch()

  const handleAutofill = async () => {
    const values = form.getValues()
    const context = {
      hanzi: values.hanzi || undefined,
      pinyin: values.pinyin || undefined,
      english: values.english || undefined,
      notes: values.notes || undefined,
      type: values.type || undefined
    }

    // Check if there's any context to work with
    const hasContext = Object.values(context).some((v) => v && v.trim() !== "")
    if (!hasContext) {
      toast.error("Please fill in at least one field first")
      return
    }

    // Find empty fields to fill
    const fieldsToFill: AutofillField[] = []
    if (!values.hanzi) fieldsToFill.push("hanzi")
    if (!values.pinyin) fieldsToFill.push("pinyin")
    if (!values.english) fieldsToFill.push("english")
    if (!values.notes) fieldsToFill.push("notes")

    if (fieldsToFill.length === 0) {
      toast.error("All fields are already filled")
      return
    }

    setAutofillLoading("hanzi") // Just use one to show loading state

    try {
      // Fill all empty fields
      for (const field of fieldsToFill) {
        const res = await fetch("/api/autofill-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, context })
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || "Failed to autofill")
        }

        const { value } = await res.json()
        form.setValue(field, value, { shouldValidate: true })

        // Update context for next field
        context[field] = value
      }

      toast.success(`Generated ${fieldsToFill.length} field(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to autofill")
    } finally {
      setAutofillLoading(null)
    }
  }

  const AutofillButton = () => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={handleAutofill}
      disabled={autofillLoading !== null}
      title="Auto-fill empty fields"
    >
      {autofillLoading !== null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wand2 className="h-4 w-4" />
      )}
    </Button>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hanzi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hanzi (Chinese Characters)</FormLabel>
                <div className="flex gap-1">
                  <FormControl>
                    <Input placeholder="中文" {...field} />
                  </FormControl>
                  {watchedValues.hanzi && <AutofillButton />}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pinyin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pinyin</FormLabel>
                <div className="flex gap-1">
                  <FormControl>
                    <Input placeholder="zhōng wén" {...field} />
                  </FormControl>
                  {watchedValues.pinyin && <AutofillButton />}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="english"
          render={({ field }) => (
            <FormItem>
              <FormLabel>English Translation</FormLabel>
              <div className="flex gap-1">
                <FormControl>
                  <Input placeholder="Chinese language" {...field} />
                </FormControl>
                {watchedValues.english && <AutofillButton />}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <div className="flex gap-1">
                <FormControl>
                  <Textarea
                    placeholder="Additional notes or context..."
                    {...field}
                  />
                </FormControl>
                {watchedValues.notes && <AutofillButton />}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="VOCABULARY">Vocabulary</SelectItem>
                  <SelectItem value="GRAMMAR">Grammar</SelectItem>
                  <SelectItem value="PHRASE">Phrase</SelectItem>
                  <SelectItem value="IDIOM">Idiom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Update Card" : "Add Card"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
