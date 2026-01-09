import { FileUploadZone } from "@/components/admin/file-upload-zone"
import { DocumentsList } from "@/components/admin/documents-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, FileText, Share2, Activity, ChevronRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function DocumentsAdminPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground">OpsMind Admin</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span>Document Management</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-border bg-sidebar hidden md:flex flex-col">
          <nav className="p-4 space-y-2">
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </Link>
            <Link
              href="/admin/documents"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary font-medium"
            >
              <FileText className="w-4 h-4" />
              Documents
            </Link>
            <Link
              href="/admin/knowledge-graph"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Knowledge Graph
            </Link>
            <Link
              href="/admin/analytics"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Activity className="w-4 h-4" />
              Analytics
            </Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-3xl font-bold">Document Ingestion</h2>
              <p className="text-muted-foreground mt-1">
                Upload files to expand the AI's knowledge base. Supports semantic chunking and automatic metadata
                extraction.
              </p>
            </div>

            <FileUploadZone />

            <DocumentsList />

            <Card className="border-border bg-card/30">
              <CardHeader>
                <CardTitle>Ingestion Guidelines</CardTitle>
                <CardDescription>Best practices for high-quality RAG performance.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Clean Text
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Ensure PDFs are text-searchable (not just images) for accurate embedding generation.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Metadata Optimization
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Including headers and dates in files helps the AI provide better temporal context.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
