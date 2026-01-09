"use client"

type MessageLike = { id: string; role: "user" | "assistant" | "system"; content: string }
import { Brain, User, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ChatMessageProps {
  message: MessageLike
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  // Parse appended Sources footer to extract citations and strip it from the visible content
  let content = message.content
  let citations: { title: string; page?: number }[] = []
  if (isAssistant && typeof content === "string") {
    const parts = content.split(/\n+Sources:\n/i)
    if (parts.length >= 2) {
      content = parts[0].trim()
      const lines = parts[1].split(/\n+/).map((l) => l.trim()).filter(Boolean)
      citations = lines
        .filter((l) => l.startsWith("- [") && l.endsWith("]"))
        .map((l) => {
          const inner = l.slice(3, -1) // remove '- [' and trailing ']'
          // Expected formats: 'Title, Page X' or 'Title'
          const m = inner.match(/^(.+?)(?:,\s*Page\s*(\d+))?$/i)
          const title = (m?.[1] || inner).trim()
          const page = m?.[2] ? Number(m[2]) : undefined
          return { title, page }
        })
    }
  }

  return (
    <div className={cn("flex gap-4 group", !isAssistant && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
          isAssistant ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground",
        )}
      >
        {isAssistant ? <Brain className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      <div className={cn("flex flex-col space-y-2 max-w-[85%]", !isAssistant && "items-end")}>
        <Card
          className={cn(
            "px-4 py-3 rounded-2xl border shadow-sm text-sm leading-relaxed",
            isAssistant ? "bg-card border-border" : "bg-primary text-primary-foreground border-primary",
          )}
        >
          {content}
        </Card>

        {isAssistant && citations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-medium text-muted-foreground self-center uppercase tracking-wider">
              Sources:
            </span>
            {citations.map((cite, idx) => (
              <Badge
                key={`${cite.title}-${cite.page ?? "na"}-${idx}`}
                variant="secondary"
                className="text-[10px] h-5 gap-1 hover:bg-secondary cursor-pointer border-border"
              >
                {cite.title}
                {typeof cite.page === "number" ? ` (p. ${cite.page})` : ""}
                <ExternalLink className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
