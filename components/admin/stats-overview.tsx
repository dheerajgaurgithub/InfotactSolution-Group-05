"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, FileText, MessageSquare } from "lucide-react"

export function StatsOverview() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        setTotals(data.totals || null)
        setInventory(data.inventory || null)
        setQueriesLast24h(data.queriesLast24h || 0)
      } catch (e: any) {
        setError(e?.message || "Failed to load stats")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border bg-card/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <FileText className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inventory?.totalDocuments ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Live count</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vector Embeddings</CardTitle>
          <Database className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inventory?.totalChunks ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Stored chunks</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
          <MessageSquare className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{queriesLast24h}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
          <MessageSquare className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals?.totalQueries ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Cumulative</p>
        </CardContent>
      </Card>

      {!loading && error && (
        <div className="col-span-full text-xs text-red-500">{error}</div>
      )}
    </div>
  )
}
