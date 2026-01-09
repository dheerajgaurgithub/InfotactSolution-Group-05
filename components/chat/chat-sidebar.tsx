"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, PanelLeft, Plus, Settings, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedDocIds?: string[]
  setSelectedDocIds?: (ids: string[]) => void
}

type DocItem = { id: string; title: string }

export function ChatSidebar({ isOpen, setIsOpen, selectedDocIds = [], setSelectedDocIds }: ChatSidebarProps) {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingDocs(true)
        const res = await fetch(`/api/documents?public=1&limit=50`)
        if (!res.ok) return
        const data = await res.json()
        const items: DocItem[] = Array.isArray(data?.documents)
          ? data.documents.map((d: any) => ({ id: String(d.id || d._id), title: String(d.title || "Document") }))
          : []
        if (!cancelled) setDocs(items)
        if (!cancelled) setLastLoadedAt(Date.now())
      } finally {
        if (!cancelled) setLoadingDocs(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleDoc = (id: string) => {
    if (!setSelectedDocIds) return
    setSelectedDocIds(
      selectedDocIds.includes(id)
        ? selectedDocIds.filter((x) => x !== id)
        : [...selectedDocIds, id],
    )
  }

  return (
    <aside
      className={cn(
        "border-r border-border bg-sidebar transition-all duration-300 flex flex-col h-full",
        isOpen ? "w-64" : "w-0 overflow-hidden border-none",
      )}
    >
      <div className="p-4 flex items-center justify-between">
        <Button
          className="flex-1 gap-2 justify-start rounded-xl border-dashed border-2 hover:bg-sidebar-accent transition-all bg-transparent"
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="ml-2">
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Sources</h4>
            <div className="space-y-1">
              {loadingDocs && <div className="text-[10px] text-muted-foreground px-2">Loading documents…</div>}
              {!loadingDocs && docs.length === 0 && (
                <div className="text-[10px] text-muted-foreground px-2">No documents</div>
              )}
              <div className="flex items-center gap-2 px-2 py-1">
                <Button
                  variant="outline"
                  size="xs"
                  className="h-6 px-2 text-[10px]"
                  onClick={async () => {
                    // reload documents list
                    try {
                      setLoadingDocs(true)
                      const res = await fetch(`/api/documents?public=1&limit=50&_t=${Date.now()}`)
                      if (!res.ok) return
                      const data = await res.json()
                      const items: DocItem[] = Array.isArray(data?.documents)
                        ? data.documents.map((d: any) => ({ id: String(d.id || d._id), title: String(d.title || "Document") }))
                        : []
                      setDocs(items)
                      setLastLoadedAt(Date.now())
                    } finally {
                      setLoadingDocs(false)
                    }
                  }}
                >
                  Refresh
                </Button>
                {lastLoadedAt && (
                  <span className="text-[10px] text-muted-foreground">{new Date(lastLoadedAt).toLocaleTimeString()}</span>
                )}
              </div>
              {docs.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-sidebar-accent cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selectedDocIds.includes(d.id)}
                    onChange={() => toggleDoc(d.id)}
                  />
                  <span className="truncate" title={d.title}>{d.title}</span>
                </label>
              ))}
              {selectedDocIds.length > 0 && (
                <div className="px-2 pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Selected</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDocIds.map((id) => {
                      const t = docs.find((x) => x.id === id)?.title || id
                      return (
                        <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[10rem]" title={t}>
                          {t}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* History section intentionally removed as requested */}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border mt-auto space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Chats
        </Button>
      </div>
    </aside>
  )
}
