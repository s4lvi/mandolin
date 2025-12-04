"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCards, useDeleteCard } from "@/hooks/use-cards"
import { useLessons } from "@/hooks/use-lessons"
import { CardItem } from "@/components/cards/card-item"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Plus, Search, Upload, BookOpen, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { LessonAssociationModal } from "@/components/lessons/lesson-association-modal"

const CARDS_PER_PAGE = 12

export default function DeckPage() {
  const searchParams = useSearchParams()
  const lessonIdFromUrl = searchParams.get("lessonId")

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<{ id: string; name: string } | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [showAddToLessonModal, setShowAddToLessonModal] = useState(false)
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false)

  const { data: cards, isLoading } = useCards({
    lessonId: lessonIdFromUrl || undefined
  })
  const deleteCardMutation = useDeleteCard()
  const { data: lessons } = useLessons()

  // Find lesson info if filtering by lesson
  const currentLesson = lessonIdFromUrl && lessons && Array.isArray(lessons)
    ? lessons.find(l => l.id === lessonIdFromUrl)
    : null

  const filteredCards = cards?.filter((card) => {
    const matchesSearch =
      card.hanzi.includes(search) ||
      card.pinyin.toLowerCase().includes(search.toLowerCase()) ||
      card.english.toLowerCase().includes(search.toLowerCase()) ||
      card.tags.some((t) => t.tag.name.toLowerCase().includes(search.toLowerCase()))

    const matchesType = typeFilter === "all" || card.type === typeFilter

    const matchesTag = !tagFilter || card.tags.some((t) => t.tagId === tagFilter.id)

    return matchesSearch && matchesType && matchesTag
  })

  // Pagination calculations
  const totalPages = Math.ceil((filteredCards?.length || 0) / CARDS_PER_PAGE)
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE
  const endIndex = startIndex + CARDS_PER_PAGE
  const paginatedCards = filteredCards?.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  const handleTagClick = (tagId: string, tagName: string) => {
    setTagFilter({ id: tagId, name: tagName })
    setCurrentPage(1)
  }

  const handleClearTagFilter = () => {
    setTagFilter(null)
    setCurrentPage(1)
  }

  const handleDelete = async () => {
    if (!deleteCardId) return

    try {
      await deleteCardMutation.mutateAsync(deleteCardId)
      toast.success("Card deleted")
      setDeleteCardId(null)

      // If we deleted the last card on the current page, go to previous page
      if (paginatedCards?.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    } catch {
      toast.error("Failed to delete card")
    }
  }

  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedCards(new Set())
  }

  const handleToggleCard = (cardId: string) => {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      newSelected.add(cardId)
    }
    setSelectedCards(newSelected)
  }

  const handleSelectAll = () => {
    if (paginatedCards) {
      setSelectedCards(new Set(paginatedCards.map(c => c.id)))
    }
  }

  const handleCancelSelection = () => {
    setSelectionMode(false)
    setSelectedCards(new Set())
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">My Deck</h1>
        <div className="flex gap-2">
          {!selectionMode && (
            <>
              <Button variant="outline" onClick={handleToggleSelectionMode}>
                Select Cards
              </Button>
              <Link href="/upload">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Notes
                </Button>
              </Link>
              <Link href="/deck/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cards
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Selection Mode Toolbar */}
      {selectionMode && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                </span>
                {paginatedCards && selectedCards.size < paginatedCards.length && (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={selectedCards.size === 0}
                  onClick={() => setShowAddToLessonModal(true)}
                >
                  Add to Lesson
                </Button>
                <Button
                  disabled={selectedCards.size === 0}
                  onClick={() => setShowCreateLessonModal(true)}
                >
                  Create Lesson
                </Button>
                <Button variant="ghost" onClick={handleCancelSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards or tags..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="VOCABULARY">Vocabulary</SelectItem>
            <SelectItem value="GRAMMAR">Grammar</SelectItem>
            <SelectItem value="PHRASE">Phrase</SelectItem>
            <SelectItem value="IDIOM">Idiom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currentLesson && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Viewing: Lesson {currentLesson.number}
            {currentLesson.title && ` - ${currentLesson.title}`}
          </span>
          <span className="text-xs text-muted-foreground">
            ({cards?.length || 0} cards)
          </span>
          <Link href="/deck">
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2">
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </Link>
        </div>
      )}

      {tagFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by tag:</span>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleClearTagFilter}
          >
            {tagFilter.name}
            <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading cards...</p>
        </div>
      ) : filteredCards?.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No cards yet</h3>
          <p className="text-muted-foreground mb-4">
            {search || typeFilter !== "all" || tagFilter
              ? "No cards match your filters"
              : "Start by adding cards or uploading your lesson notes"}
          </p>
          {!search && typeFilter === "all" && !tagFilter && (
            <div className="flex gap-2 justify-center">
              <Link href="/deck/add">
                <Button variant="outline">Add Cards</Button>
              </Link>
              <Link href="/upload">
                <Button>Upload Notes</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCards?.length || 0)} of {filteredCards?.length || 0} cards
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCards?.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onDelete={(id) => setDeleteCardId(id)}
                onTagClick={handleTagClick}
                selectionMode={selectionMode}
                isSelected={selectedCards.has(card.id)}
                onToggleSelect={handleToggleCard}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page - prevPage > 1

                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-9 h-9 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    )
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCardId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCardMutation.isPending}
            >
              {deleteCardMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Lesson Modal */}
      <LessonAssociationModal
        open={showAddToLessonModal}
        onClose={() => {
          setShowAddToLessonModal(false)
          setSelectionMode(false)
          setSelectedCards(new Set())
        }}
        cardIds={Array.from(selectedCards)}
        cardCount={selectedCards.size}
        mode="add"
        onSuccess={() => {
          setShowAddToLessonModal(false)
          setSelectionMode(false)
          setSelectedCards(new Set())
        }}
      />

      {/* Create Lesson from Selection Modal */}
      <LessonAssociationModal
        open={showCreateLessonModal}
        onClose={() => {
          setShowCreateLessonModal(false)
          setSelectionMode(false)
          setSelectedCards(new Set())
        }}
        cardIds={Array.from(selectedCards)}
        cardCount={selectedCards.size}
        mode="create"
        onSuccess={() => {
          setShowCreateLessonModal(false)
          setSelectionMode(false)
          setSelectedCards(new Set())
        }}
      />
    </div>
    </ErrorBoundary>
  )
}
