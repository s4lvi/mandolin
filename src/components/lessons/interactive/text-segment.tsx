import { Card, CardContent } from "@/components/ui/card"

interface TextSegmentProps {
  title?: string
  text: string
}

export function TextSegment({ title, text }: TextSegmentProps) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-6">
        {title && <h3 className="font-semibold text-lg mb-3">{title}</h3>}
        <p className="text-muted-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  )
}
