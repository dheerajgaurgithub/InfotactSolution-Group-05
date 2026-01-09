"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type Doc = {
  id: string
  title: string
  chunkCount: number
  createdAt: string
  fileType?: string
}

export function DocumentsList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [openDocId, setOpenDocId] = useState<string | null>(null)
  const [chunks, setChunks] = useState<Record<string, { id: string; content: string; page: number | null }[]>>({})
  const [chunksLoading, setChunksLoading] = useState<Record<string, boolean>>({})
  const [chunksError, setChunksError] = useState<Record<string, string | null>>({})
  const [openReingestId, setOpenReingestId] = useState<string | null>(null)
  const [reingestText, setReingestText] = useState<Record<string, string>>({})
  const [reingestLoading, setReingestLoading] = useState<Record<string, boolean>>({})
  const [reingestMsg, setReingestMsg] = useState<Record<string, string | null>>({})

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/documents?limit=50", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDocs(
        (data.documents || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          chunkCount: d.chunkCount,
          createdAt: d.createdAt,
          fileType: d.fileType,
        })),
      )
    } catch (e: any) {
      setError(e?.message || "Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onDelete = async (id: string) => {
    const ok = confirm("Delete this document and its chunks?")
    if (!ok) return
    const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (res.ok) {
      await load()
    }
  }

  const toggleChunks = async (docId: string) => {
    if (openDocId === docId) {
      setOpenDocId(null)
      return
    }
    setOpenDocId(docId)
    if (chunks[docId]) return
    try {
      setChunksLoading((s) => ({ ...s, [docId]: true }))
      setChunksError((s) => ({ ...s, [docId]: null }))
      const res = await fetch(`/api/document-chunks?documentId=${encodeURIComponent(docId)}&limit=200`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setChunks((m) => ({ ...m, [docId]: data.chunks || [] }))
    } catch (e: any) {
      setChunksError((s) => ({ ...s, [docId]: e?.message || "Failed to load chunks" }))
    } finally {
      setChunksLoading((s) => ({ ...s, [docId]: false }))
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium">Ingested Documents</h3>
        <p className="text-xs text-muted-foreground">Persisted in MongoDB. Refresh-safe.</p>
      </div>
      <div className="divide-y divide-border">
        {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {error && <div className="p-4 text-sm text-red-500">{error}</div>}
        {!loading && !error && docs.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No documents yet. Upload a PDF above.</div>
        )}
        {!loading && !error &&
          docs.map((d) => (
            <div key={d.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.fileType || "file"} • {d.chunkCount} chunks • {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggleChunks(d.id)}>
                    {openDocId === d.id ? "Hide chunks" : "View chunks"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenReingestId((id) => (id === d.id ? null : d.id))}
                  >
                    {openReingestId === d.id ? "Hide re-ingest" : "Re-ingest (paste text)"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDelete(d.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              {openDocId === d.id && (
                <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-3">
                  {chunksLoading[d.id] && (
                    <div className="text-xs text-muted-foreground">Loading chunks…</div>
                  )}
                  {chunksError[d.id] && (
                    <div className="text-xs text-red-500">{chunksError[d.id]}</div>
                  )}
                  {!chunksLoading[d.id] && !chunksError[d.id] && (
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {(chunks[d.id] || []).length === 0 && (
                        <div className="text-xs text-muted-foreground">No chunks found. If this is a scanned PDF, enable OCR ingestion.</div>
                      )}
                      {(chunks[d.id] || []).map((c) => (
                        <div key={c.id} className="text-xs p-2 rounded border border-border/50 bg-card/50">
                          <div className="text-[10px] text-muted-foreground mb-1">Page {c.page ?? "-"}</div>
                          <div className="whitespace-pre-wrap">{c.content.slice(0, 200)}{c.content.length > 200 ? "…" : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {openReingestId === d.id && (
                <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Paste raw text from the document below. It will be chunked and embedded, replacing existing chunks.
                  </div>
                  <textarea
                    className="w-full min-h-28 text-sm p-2 rounded border border-border bg-card"
                    placeholder="Paste document text…"
                    value={reingestText[d.id] || ""}
                    onChange={(e) => setReingestText((m) => ({ ...m, [d.id]: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        setReingestMsg((s) => ({ ...s, [d.id]: null }))
                        setReingestLoading((s) => ({ ...s, [d.id]: true }))
                        try {
                          const body = { documentId: d.id, text: reingestText[d.id] || "" }
                          const res = await fetch("/api/documents/reingest", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.reason || data.error || `HTTP ${res.status}`)
                          setReingestMsg((s) => ({ ...s, [d.id]: `Re-ingested ${data.chunkCount} chunks.` }))
                          // Refresh chunks panel if open
                          if (openDocId === d.id) {
                            setChunks((m) => ({ ...m, [d.id]: undefined as any }))
                            setOpenDocId(null)
                          }
                          await load()
                        } catch (e: any) {
                          setReingestMsg((s) => ({ ...s, [d.id]: e?.message || "Failed to re-ingest" }))
                        } finally {
                          setReingestLoading((s) => ({ ...s, [d.id]: false }))
                        }
                      }}
                      disabled={reingestLoading[d.id] || !(reingestText[d.id] || "").trim()}
                    >
                      {reingestLoading[d.id] ? "Re-ingesting…" : "Re-ingest"}
                    </Button>
                    {reingestMsg[d.id] && (
                      <span className="text-xs text-muted-foreground">{reingestMsg[d.id]}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
