import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Brain, Search, FileText, Shield, Zap, Database } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">OpsMind AI</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </Link>
              <Link href="#admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button asChild={false} variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button asChild={false} size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Built for Enterprise Accuracy</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-balance mb-6 leading-tight">
              Trustworthy Knowledge,
              <span className="text-primary"> Zero Guesswork</span>
            </h1>
            <p className="text-xl text-muted-foreground text-balance mb-8 leading-relaxed max-w-2xl mx-auto">
              OpsMind AI organizes your company's PDFs and files into a reliable knowledge base. Get precise answers
              with source citations, and when the answer isn't there, we'll tell you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/chat">
                <Button asChild={false} size="lg" className="min-w-[160px]">
                  Start Chatting
                  <Search className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/admin/documents">
                <Button asChild={false} size="lg" variant="outline" className="min-w-[160px] bg-transparent">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-Grade Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage and query your corporate knowledge base
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Answers Only</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI is grounded in your documents. If the information isn&apos;t there, it simply says &quot;I
                don&apos;t know,&quot; eliminating hallucinations.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Citation Engine</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every answer comes with precise citations, showing exact passages and documents for full transparency.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Format Support</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ingest PDFs, DOCX, spreadsheets, and more. Our system handles all your document types seamlessly.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                Role-based access control, audit logs, and SOC 2 compliance ensure your data stays protected.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Knowledge Graph</h3>
              <p className="text-muted-foreground leading-relaxed">
                Visualize relationships between documents and concepts with our interactive knowledge graph.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get answers in seconds with optimized vector search and caching for frequently asked questions.
              </p>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From raw documents to reliable answers in three steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Ingest & Organize</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload PDFs, policies, and files. Our system chunks and understands every paragraph for precise
                retrieval.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-accent">
                <span className="text-2xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Semantic Retrieval</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use advanced vector search to find the exact proof needed to answer your employees&apos; questions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Guaranteed Accuracy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Employees get clear answers with citations. No guessing, no wrong info—just company facts.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 mb-16">
          <Card className="p-12 bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Knowledge Management?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join forward-thinking companies using OpsMind AI to empower their teams.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button asChild={false} size="lg" className="min-w-[180px]">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/admin/documents">
                  <Button asChild={false} size="lg" variant="outline" className="min-w-[180px] bg-transparent">
                    Schedule Demo
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">OpsMind AI</span>
              </div>
              <p className="text-sm text-muted-foreground">© 2025 OpsMind AI. Enterprise Knowledge Assistant.</p>
            </div>
          </div>
        </footer>
      </div>
    </Suspense>
  )
}
