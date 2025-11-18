"use client"

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
import { createCardSchema, type CreateCardInput } from "@/lib/validations/card"
import type { Card } from "@/types"

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
                <FormControl>
                  <Input placeholder="中文" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input placeholder="zhōng wén" {...field} />
                </FormControl>
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
              <FormControl>
                <Input placeholder="Chinese language" {...field} />
              </FormControl>
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
              <FormControl>
                <Textarea
                  placeholder="Additional notes or context..."
                  {...field}
                />
              </FormControl>
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
