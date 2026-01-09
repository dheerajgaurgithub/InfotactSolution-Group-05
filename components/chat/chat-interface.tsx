"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Brain, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatSidebar } from "@/components/chat/chat-sidebar"

export function ChatInterface() {
  const [chatId, setChatId] = useState<string | null>(null)
  type Msg = { id: string; role: "user" | "assistant" | "system"; content: string }
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    const ensureChat = async () => {
      try {
        if (chatId) return
        const res = await fetch("/api/chats", { method: "POST" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setChatId(data.id)
      } catch {
        /* noop */
      }
    }
    ensureChat()
    return () => {
      cancelled = true
    }
  }, [chatId])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const append = (m: Msg) => setMessages((prev) => [...prev, m])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)
    const minThinkMs = 5000
    const startedAt = Date.now()
    try {
      // Require at least one source for best retrieval quality
      if (!selectedDocIds || selectedDocIds.length === 0) {
        const tip: Msg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Please select at least one document in Sources (left sidebar) to get a better, grounded response.",
        }
        setMessages((prev) => [...prev, tip])
        setIsLoading(false)
        return
      }
      const res = await fetch("/api/chat?mode=stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], chatId, documentIds: selectedDocIds }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      // Ensure at least 5s of visible thinking BEFORE starting to show the response
      {
        const elapsed = Date.now() - startedAt
        const waitMore = Math.max(0, minThinkMs - elapsed)
        if (waitMore > 0) {
          await new Promise((r) => setTimeout(r, waitMore))
        }
        setIsLoading(false)
      }

      // Create a live assistant message and append chunks into it
      const assistantId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) {
          if (isLoading) {
            // Safety: ensure thinking indicator is hidden once content starts streaming
            setIsLoading(false)
          }
          acc += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          )
        }
      }
    } catch {
      const errMsg: Msg = { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong." }
      // Respect minimum think time before showing the error
      const elapsed = Date.now() - startedAt
      const waitMore = Math.max(0, minThinkMs - elapsed)
      if (waitMore > 0) {
        await new Promise((r) => setTimeout(r, waitMore))
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      // no-op; loading state is cleared before streaming begins or after error wait
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} selectedDocIds={selectedDocIds} setSelectedDocIds={setSelectedDocIds} />

      <main className="flex-1 flex flex-col relative min-h-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">OpsMind Assistant</h1>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Sources: {selectedDocIds.length}
            </span>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Context Info</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-40">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">What can I find for you?</h2>
                <p className="text-muted-foreground max-w-sm">
                  I search across your company documents to give you verified answers. I won&apos;t guess if the info
                  isn&apos;t available.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto p-4 flex-col items-start gap-1 bg-transparent"
                    onClick={() => append({ id: crypto.randomUUID(), role: "user", content: "What is our remote work policy?" })}
                  >
                    <span className="font-semibold">Company Policy</span>
                    <span className="text-xs text-muted-foreground">What is our remote work policy?</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto p-4 flex-col items-start gap-1 bg-transparent"
                    onClick={() => append({ id: crypto.randomUUID(), role: "user", content: "Summarize the onboarding steps." })}
                  >
                    <span className="font-semibold">Onboarding</span>
                    <span className="text-xs text-muted-foreground">Summarize the onboarding steps.</span>
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((m) => <ChatMessage key={m.id} message={m} />)
            )}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <span className="relative flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span>Thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedDocIds.length === 0 ? "Select Sources on the left, then ask your question..." : "Ask OpsMind AI..."}
                className="pr-12 py-6 rounded-xl border-border bg-card shadow-lg focus-visible:ring-primary"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button type="submit" size="icon" className="rounded-lg h-9 w-9" disabled={isLoading || !input.trim() || selectedDocIds.length === 0}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            OpsMind AI can make mistakes. Verify important information with source citations.
          </p>
        </div>
      </main>
    </div>
  )
}
