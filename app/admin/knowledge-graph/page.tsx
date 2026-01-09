"use client"

import { useEffect, useMemo, useState } from "react"

type Node = { id: string; count: number }
type Link = { source: string; target: string; weight: number }

export default function KnowledgeGraphPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/knowledge-graph", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setNodes(data.nodes || [])
        setLinks(data.links || [])
      } catch (e: any) {
        setError(e?.message || "Failed to load graph")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const layout = useMemo(() => {
    const W = 900
    const H = 520
    const cx = W / 2
    const cy = H / 2
    const R = Math.min(W, H) / 2 - 40
    const maxCount = Math.max(1, ...nodes.map((n) => n.count))
    const maxWeight = Math.max(1, ...links.map((l) => l.weight))

    const positions: Record<string, { x: number; y: number; r: number }> = {}
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2
      const r = 10 + (n.count / maxCount) * 18
      positions[n.id] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), r }
    })

    const linkPaths = links.map((l) => {
      const a = positions[l.source]
      const b = positions[l.target]
      if (!a || !b) return null
      const w = 0.5 + (l.weight / maxWeight) * 3
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, w }
    }).filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; w: number }[]

    return { W, H, positions, linkPaths }
  }, [nodes, links])

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold mb-2">Knowledge Graph</h1>
      <p className="text-sm text-muted-foreground mb-6">Most-referenced documents and their relationships (co-citations).</p>

      {loading && <div className="text-sm text-muted-foreground">Loading graph…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="rounded-lg border border-border bg-card/30 p-3 overflow-auto">
          <svg width={layout.W} height={layout.H} className="block mx-auto">
            {/* Links */}
            {layout.linkPaths.map((p, i) => (
              <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#8884" strokeWidth={p.w} />
            ))}

            {/* Nodes */}
            {nodes.map((n) => {
              const pos = layout.positions[n.id]
              if (!pos) return null
              return (
                <g key={n.id}>
                  <circle cx={pos.x} cy={pos.y} r={pos.r} fill="#6ea8fe" fillOpacity={0.85} stroke="#1f4fff" strokeOpacity={0.6} />
                  <text x={pos.x} y={pos.y - pos.r - 6} textAnchor="middle" fontSize={10} fill="#888">
                    {n.id}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
