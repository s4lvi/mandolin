"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search } from "lucide-react"
import { useCards } from "@/hooks/use-cards"
import { useAssociateCardsWithLesson } from "@/hooks/use-lessons"
import { toast } from "sonner"

interface AddCardsToLessonDialogProps {
  open: boolean
  onClose: () => void
  lessonId: string
  /** Card ids already in this lesson — excluded from the picker. */
  existingCardIds: string[]
}

export function AddCardsToLessonDialog({
  open,
  onClose,
  lessonId,
  existingCardIds
}: AddCardsToLessonDialogProps) {
  const { data: cards, isLoading } = useCards()
  const associate = useAssociateCardsWithLesson()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  const existing = useMemo(() => new Set(existingCardIds), [existingCardIds])
  const candidates = useMemo(() => {
    const list = (cards || []).filter((c) => !existing.has(c.id))
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.hanzi.includes(search) ||
        c.pinyin.toLowerCase().includes(q) ||
        c.english.toLowerCase().includes(q)
    )
  }, [cards, existing, search])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAdd = async () => {
    if (selected.length === 0) return
    try {
      const res = await associate.mutateAsync({ cardIds: selected, lessonId })
      toast.success(`Added ${res.updatedCount} card${res.updatedCount === 1 ? "" : "s"} to the lesson`)
      setSelected([])
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add cards")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add cards to this lesson</DialogTitle>
          <DialogDescription>
            Pick existing deck cards to include. Cards can belong to multiple lessons.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-[45vh] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No other cards available.
            </p>
          ) : (
            candidates.map((card) => {
              const checked = selected.includes(card.id)
              return (
                <label
                  key={card.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(card.id)} />
                  <span className="text-base font-medium shrink-0">{card.hanzi}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{card.pinyin}</span>
                  <span className="text-sm flex-1 min-w-0 truncate">{card.english}</span>
                </label>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={associate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={associate.isPending || selected.length === 0}>
            {associate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
