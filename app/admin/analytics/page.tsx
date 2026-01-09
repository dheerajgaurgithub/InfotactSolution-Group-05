"use client"

import { useEffect, useMemo, useState } from "react"

type TopDoc = { title: string; count: number }
type TopPage = { title: string; page: number; count: number }
type TrendPoint = { day: string; count: number }

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topDocuments, setTopDocuments] = useState<TopDoc[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [usageTrend, setUsageTrend] = useState<TrendPoint[]>([])
  const [totals, setTotals] = useState<{ totalQueries: number; totalAnswers: number } | null>(null)
  const [inventory, setInventory] = useState<{ totalDocuments: number; totalChunks: number } | null>(null)
  const [queriesLast24h, setQueriesLast24h] = useState<number>(0)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/analytics", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setTopDocuments(data.topDocuments || [])
        setTopPages(data.topPages || [])
        setUsageTrend(data.usageTrend || [])
        setTotals(data.totals || null)
        setInventory(data.inventory || null)
        setQueriesLast24h(data.queriesLast24h || 0)
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const maxTrend = useMemo(() => Math.max(1, ...usageTrend.map((p) => p.count)), [usageTrend])

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold mb-1">Analytics</h1>
      <p className="text-sm text-muted-foreground mb-6">Usage trends, top documents and pages.</p>

      {loading && <div className="text-sm text-muted-foreground">Loading analytics…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border p-4 bg-card/30">
              <div className="text-xs text-muted-foreground">Total Queries</div>
              <div className="text-2xl font-semibold">{totals?.totalQueries ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card/30">
              <div className="text-xs text-muted-foreground">Total Answers</div>
              <div className="text-2xl font-semibold">{totals?.totalAnswers ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card/30">
              <div className="text-xs text-muted-foreground">Total Documents</div>
              <div className="text-2xl font-semibold">{inventory?.totalDocuments ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card/30">
              <div className="text-xs text-muted-foreground">Total Chunks</div>
              <div className="text-2xl font-semibold">{inventory?.totalChunks ?? 0}</div>
            </div>
          </div>

          {/* Last 24h */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 bg-card/30">
              <div className="text-xs text-muted-foreground">Queries (last 24h)</div>
              <div className="text-2xl font-semibold">{queriesLast24h}</div>
            </div>
          </div>

          {/* Usage Trend */}
          <div className="rounded-lg border border-border p-4 bg-card/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-medium">Queries (last 14 days)</h2>
              <div className="text-xs text-muted-foreground">Daily count</div>
            </div>
            <div className="flex items-end gap-2 h-28">
              {usageTrend.map((p) => (
                <div key={p.day} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary/30 rounded-t"
                    style={{ height: `${(p.count / maxTrend) * 100 || 4}%` }}
                    title={`${p.day}: ${p.count}`}
                  />
                  <div className="mt-1 text-[10px] text-muted-foreground rotate-45 origin-top-left">
                    {p.day.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Documents */}
          <div className="rounded-lg border border-border p-4 bg-card/30">
            <h2 className="text-base font-medium mb-3">Top Documents (by citations)</h2>
            <div className="space-y-2">
              {topDocuments.length === 0 && (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              )}
              {topDocuments.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="truncate max-w-[70%]">{d.title}</div>
                  <div className="text-muted-foreground">{d.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages */}
          <div className="rounded-lg border border-border p-4 bg-card/30">
            <h2 className="text-base font-medium mb-3">Top Pages (by citations)</h2>
            <div className="space-y-2">
              {topPages.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
              {topPages.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="truncate max-w-[70%]">[{p.title}, Page {p.page}]</div>
                  <div className="text-muted-foreground">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
