"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, FileText, Share2, Activity, Settings, Users } from "lucide-react"
import { KnowledgeGraph } from "@/components/admin/knowledge-graph"
import { StatsOverview } from "@/components/admin/stats-overview"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminDashboard() {
  const pathname = usePathname()
  const items = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: FileText, label: "Documents", href: "/admin/documents" },
    { icon: Share2, label: "Knowledge Graph", href: "/admin/knowledge-graph" },
    { icon: Activity, label: "Analytics", href: "/admin/analytics" },
    { icon: Settings, label: "System Settings", href: "/admin/settings" },
  ]
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">OpsMind Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4 hidden sm:block">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Admin Sidebar */}
        <aside className="w-64 border-r border-border bg-sidebar hidden md:flex flex-col">
          <nav className="p-4 space-y-2">
            {items.map((item, i) => {
              const active = pathname === item.href
              return (
                <Link
                  key={i}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">System Overview</h2>
                <p className="text-muted-foreground mt-1">Manage your enterprise knowledge and monitoring metrics.</p>
              </div>
            </div>

            <StatsOverview />

            <Tabs defaultValue="graph" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
                <TabsTrigger value="documents">Recent Ingestion</TabsTrigger>
              </TabsList>

              <TabsContent value="graph" className="mt-6">
                <Card className="border-border bg-card/30 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-primary" />
                      Semantic Relationships
                    </CardTitle>
                    <CardDescription>
                      Interactive visualization of conceptual links across your corporate library.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[500px] relative overflow-hidden rounded-b-xl">
                    <KnowledgeGraph />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card className="border-border bg-card/30">
                  <CardHeader>
                    <CardTitle>Ingestion History</CardTitle>
                    <CardDescription>Monitor the status of document processing and vectorization.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Compliance_Report_v{i}.pdf</p>
                              <p className="text-xs text-muted-foreground">Processed 2h ago • 45 chunks</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-primary px-2 py-1 rounded bg-primary/10">
                            Completed
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
