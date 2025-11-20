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
import { Wand2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { createCardSchema, type CreateCardInput } from "@/lib/validations/card"
import type { Card } from "@/types"
import { PREDEFINED_TAGS } from "@/lib/constants"

type AutofillField = "hanzi" | "pinyin" | "english" | "notes" | "tags"

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
      type: values.type || undefined,
      tags: values.tags?.length ? values.tags : undefined
    }

    // Check if there's any context to work with
    const hasContext = Object.values(context).some((v) => {
      if (Array.isArray(v)) return v.length > 0
      return v && v.trim() !== ""
    })
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
    if (!values.tags || values.tags.length === 0) fieldsToFill.push("tags")

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
        if (field === "tags") {
          context[field] = value
        } else {
          context[field] = value
        }
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

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Tags (optional)</FormLabel>
                {(watchedValues.hanzi || watchedValues.pinyin || watchedValues.english || watchedValues.notes) &&
                 (!field.value || field.value.length === 0) && <AutofillButton />}
              </div>

              {/* Selected tags */}
              {field.value && field.value.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
                  {field.value.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        field.onChange(field.value?.filter((t) => t !== tag) || [])
                      }}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tag selection */}
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">HSK Levels</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {PREDEFINED_TAGS.filter(t => t.startsWith("HSK")).map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={field.value?.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), tag])
                            } else {
                              field.onChange(field.value?.filter((t) => t !== tag) || [])
                            }
                          }}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-xs cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Parts of Speech</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["noun", "verb", "adjective", "adverb", "conjunction", "preposition", "particle", "measure-word", "pronoun"].map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={field.value?.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), tag])
                            } else {
                              field.onChange(field.value?.filter((t) => t !== tag) || [])
                            }
                          }}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-xs cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Topics</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["food", "travel", "business", "family", "health", "weather", "time", "numbers", "colors", "animals", "clothing", "home", "school", "work", "shopping", "transportation", "sports", "emotions", "body", "nature"].map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={field.value?.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), tag])
                            } else {
                              field.onChange(field.value?.filter((t) => t !== tag) || [])
                            }
                          }}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-xs cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Other</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["formal", "informal", "spoken", "written", "polite", "casual", "common", "essential", "advanced"].map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={field.value?.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), tag])
                            } else {
                              field.onChange(field.value?.filter((t) => t !== tag) || [])
                            }
                          }}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-xs cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
