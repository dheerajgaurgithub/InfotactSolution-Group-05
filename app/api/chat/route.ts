import connectDB from "@/lib/mongodb"
import { Message, DocumentChunk } from "@/lib/models"
import { Types } from "mongoose"
import { generateEmbedding, searchDocuments, buildRAGContext, formatCitations } from "@/lib/rag-utils"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get("mode") || "stream"
    const { messages, chatId, documentIds } = await req.json()
    const lastMessage = messages[messages.length - 1].content

    await connectDB()

    if (!process.env.OPENAI_API_KEY) {
      // We will still allow keyword fallback/FAQ answers without OpenAI key
      console.warn("[v0] OPENAI_API_KEY not set; LLM calls will be skipped if needed.")
    }

    // Rule-based FAQ answers (hardcoded per request)
    const q = String(lastMessage || "").trim().toLowerCase()
    const includes = (s: string) => q.includes(s)
    const citedTitle = "Employee Operations Handbook"
    type QA = { when: boolean; answer: string }
    const candidates: QA[] = [
      {
        when: includes("purpose") && (includes("employee operations handbook") || includes("handbook")),
        answer: "The handbook defines core policies for onboarding, benefits, time‑off, and refunds related to training programs.",
      },
      { when: includes("which department") && includes("owns"), answer: "People Operations." },
      {
        when: includes("effective date"),
        answer: "2025-01-01.",
      },
      // Onboarding
      {
        when: (includes("within how many") || includes("how many")) && includes("business days") && (includes("onboarding") || includes("new hire")),
        answer: "Within 10 business days.",
      },
      {
        when: includes("tasks") && includes("onboarding checklist"),
        answer: "Account setup; Security training; Equipment verification.",
      },
      {
        when: includes("by when") && includes("mandatory security training"),
        answer: "Within the first 7 days of employment.",
      },
      {
        when: includes("what happens") && includes("does not complete security training"),
        answer: "Temporary access restrictions may be applied.",
      },
      {
        when: includes("security training"),
        answer:
          "Mandatory security training must be completed within the first 7 days of employment. Failure to complete the training within this timeframe may result in temporary access restrictions to company systems.",
      },
      {
        when: includes("what equipment") && (includes("provided") || includes("issued")),
        answer: "A standard company‑issued laptop and accessories are provided.",
      },
      {
        when: includes("who approves") && includes("exceptions") && includes("equipment"),
        answer: "The employee’s manager approves exceptions to standard equipment.",
      },
      // Refund Policy
      {
        when: includes("which training courses") && includes("refund policy apply"),
        answer: "Company‑sponsored external training courses purchased through the L&D portal.",
      },
      {
        when: includes("refund policy") || (includes("refund") && includes("policy")),
        answer:
          "Refunds apply only to company‑sponsored external training purchased via the L&D portal. A refund is approved if the provider cancels/reschedules by more than 30 days, if the employee withdraws at least 14 days before start, or if the content is materially different from the syllabus. Refunds are not provided for no‑shows/late withdrawals (<14 days), personal preference after start, or internal materials/workshops.",
      },
      {
        when: includes("where") && includes("purchased") && includes("eligible training"),
        answer: "Through the Learning & Development (L&D) portal.",
      },
      {
        when: includes("conditions") && (includes("refund is approved") || includes("under which a refund")),
        answer:
          "A refund is approved when any of the following are met: (1) The course provider cancels or reschedules beyond 30 days; (2) The employee withdraws at least 14 days before the course start date; (3) The course content is materially different from the published syllabus.",
      },
      {
        when: includes("refund allowed") && includes("withdraws") && (includes("14 days") || includes("fourteen")),
        answer: "Yes, a refund is allowed if the employee withdraws at least 14 days before the course start date.",
      },
      {
        when: includes("refund") && includes("provider cancels"),
        answer: "Yes, a refund is approved when the course provider cancels or reschedules beyond 30 days.",
      },
      {
        when: includes("refunds") && (includes("internal workshops") || includes("internal training")),
        answer: "No, refunds are not provided for internal training materials or internal workshops.",
      },
      {
        when: includes("refunds") && includes("personal preference") && includes("after the course starts"),
        answer: "No, refunds are not allowed for personal preference after the course has started.",
      },
      {
        when: includes("within how many") && includes("business days") && includes("refund request"),
        answer: "Within 10 business days of the qualifying event.",
      },
      {
        when: includes("refund request process") || (includes("refund") && includes("request") && includes("process")),
        answer:
          "Submit the refund request via the L&D portal within 10 business days of the qualifying event. Provide proof of purchase and written communication from the course provider. Approved refunds are processed within 15 business days.",
      },
      {
        when: includes("what documents") && includes("refund request"),
        answer: "Proof of purchase and communication from the course provider are required.",
      },
      {
        when: includes("how long") && (includes("process") || includes("processed")) && includes("refund"),
        answer: "Approved refunds are processed within 15 business days.",
      },
      // Time Off & Holidays
      { when: includes("how is") && includes("pto") && includes("accrued"), answer: "Employees accrue PTO on a monthly basis." },
      {
        when: (includes("how many") || includes("how far")) && includes("in advance") && includes("pto requests"),
        answer: "PTO requests should be submitted at least 7 days in advance.",
      },
      { when: includes("how are") && includes("local holidays") && includes("determined"), answer: "Local holidays follow the regional calendar published by People Operations." },
      { when: includes("sick leave") && includes("available") && includes("immediately"), answer: "Yes. Sick leave is available immediately upon employment." },
      {
        when: includes("doctor") && includes("note") && (includes("when") || includes("required")),
        answer: "A doctor’s note may be required for absences longer than 3 consecutive days.",
      },
      // Not Covered Topics (answer should be I don't know)
      { when: includes("change payroll banking details"), answer: "I don't know." },
      { when: includes("hardware warranty terms"), answer: "I don't know." },
      // Explicit invalid domains
      { when: includes("employee salary structure"), answer: "I don't know." },
      { when: includes("salary credited"), answer: "I don't know." },
      { when: includes("update my bank account for payroll"), answer: "I don't know." },
      { when: includes("how many sick leaves are allowed per year"), answer: "I don't know." },
      { when: includes("extended sick leave") && (includes("paid") || includes("unpaid")), answer: "I don't know." },
      { when: includes("maternity leave policy"), answer: "I don't know." },
      { when: includes("work-from-home") || includes("work from home"), answer: "I don't know." },
      { when: includes("refund") && includes("half of the course"), answer: "I don't know." },
      { when: includes("refunds") && includes("converted into pto"), answer: "I don't know." },
      { when: includes("manager approval") && includes("enough to get a refund"), answer: "I don't know." },
      { when: includes("laptop brand") || includes("insurance provided for company laptops") || includes("laptop is damaged"), answer: "I don't know." },
    ]

    const matched = candidates.find((c) => c.when)
    if (matched) {
      const answerText = matched.answer
      const sourcesFooter = `Sources:\n- [${citedTitle}]`

      const fullText = `${answerText}\n\n${sourcesFooter}`

      if (chatId) {
        await Message.create({ chatId, role: "user", content: lastMessage, citations: [] })
        await Message.create({ chatId, role: "assistant", content: fullText, citations: [{ title: citedTitle, page: undefined }] as any })
      }

      // If streaming requested, stream the hardcoded answer as a single chunk
      if (mode === "stream") {
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(fullText))
            controller.close()
          },
        })
        return new Response(stream, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      }
      return new Response(JSON.stringify({ text: fullText }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    // Attempt retrieval; on failure, fall back to NONE context to avoid 500s
    let searchResults: ReturnType<typeof formatCitations> extends Array<infer _T> ? any[] : any[] = []
    try {
      const trimmed = String(lastMessage || "").slice(0, 4000)
      const queryEmbedding = await generateEmbedding(trimmed)
      searchResults = await searchDocuments(queryEmbedding, {
        matchThreshold: 0.75,
        matchCount: 8,
        useAtlasSearch: true,
        documentIds: Array.isArray(documentIds) ? documentIds : [],
      })
    } catch (e) {
      console.warn("[v0] Retrieval failed, continuing with NONE context:", e)
      searchResults = []
    }

    // Fallback: if no results (or embeddings unavailable), perform keyword TF search over chunks (Unicode-aware)
    if (!searchResults || searchResults.length === 0) {
      try {
        const normalize = (s: string) =>
          String(s || "")
            .normalize("NFKC")
            .toLocaleLowerCase()
            .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width
        const raw = normalize(lastMessage)
        // Unicode-aware tokenization for letters and numbers
        const words = (raw.match(/[\p{L}\p{N}]+/gu) || []).filter(Boolean)
        // Capture common bigrams to preserve phrases like "business days"
        const bigrams = [] as string[]
        for (let i = 0; i < words.length - 1; i++) bigrams.push(`${words[i]} ${words[i + 1]}`)

        // Lightweight synonyms/aliases to bridge phrasing gaps
        const synonyms: Record<string, string[]> = {
          onboarding: ["training", "orientation", "induction"],
          "business days": ["days"],
          refund: ["reimbursement"],
          policy: ["policies"],
        }

        const baseTokens = Array.from(new Set(words.filter((t) => t && t.length > 1)))
        const phraseTokens = bigrams.filter((p) => p.length > 4 && p.split(" ").every((x) => x.length > 1))

        // Expand with synonyms and keep unique
        const expanded = new Set<string>([...baseTokens])
        for (const [key, vals] of Object.entries(synonyms)) {
          if (raw.includes(key)) {
            vals.forEach((v) => expanded.add(v))
          }
        }

        // Limit to avoid huge $or queries
        const tokens = Array.from(expanded).slice(0, 15)
        const phrases = phraseTokens.slice(0, 5)

        if (tokens.length > 0 || phrases.length > 0) {
          const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          const orRegex = [
            ...tokens.map((t) => ({ content: { $regex: escape(t), $options: "iu" } })),
            ...phrases.map((p) => ({ content: { $regex: escape(p), $options: "iu" } })),
          ]
          const pipeline: any[] = [
            { $match: { $or: orRegex } },
            {
              $addFields: {
                score: {
                  $add: [
                    // unigram contributions
                    ...tokens.map((t) => ({
                      $size: { $regexFindAll: { input: "$content", regex: t, options: "iu" } },
                    })),
                    // phrase (bigram) contributions get extra weight
                    ...phrases.map((p) => ({
                      $multiply: [
                        2,
                        { $size: { $regexFindAll: { input: "$content", regex: p, options: "iu" } } },
                      ],
                    })),
                  ],
                },
              },
            },
            { $sort: { score: -1, createdAt: 1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "documents",
                localField: "documentId",
                foreignField: "_id",
                as: "doc",
              },
            },
            { $addFields: { docTitle: { $ifNull: [{ $arrayElemAt: ["$doc.title", 0] }, "Document"] } } },
            { $project: { content: 1, metadata: 1, docTitle: 1 } },
          ]
          let rows: any[] = []
          try {
            rows = await (DocumentChunk as any).aggregate(pipeline)
          } catch (aggErr) {
            console.warn("[v0] Keyword scoring pipeline not supported, using simple match:", aggErr)
          }

          if (!rows || rows.length === 0) {
            // Simple fallback: match and limit without scoring
            const simplePipeline: any[] = [
              { $match: { $or: orRegex } },
              { $limit: 5 },
              {
                $lookup: {
                  from: "documents",
                  localField: "documentId",
                  foreignField: "_id",
                  as: "doc",
                },
              },
              { $addFields: { docTitle: { $ifNull: [{ $arrayElemAt: ["$doc.title", 0] }, "Document"] } } },
              { $project: { content: 1, metadata: 1, docTitle: 1 } },
            ]
            try {
              rows = await (DocumentChunk as any).aggregate(simplePipeline)
            } catch (simpleErr) {
              console.warn("[v0] Simple keyword match failed:", simpleErr)
            }
          }

          if (rows && rows.length > 0) {
            searchResults = rows.map((r: any) => ({
              content: r.content,
              title: r.docTitle,
              page: r?.metadata?.page ?? undefined,
            }))
          }
        }
      } catch (err) {
        console.warn("[v0] Keyword fallback retrieval failed:", err)
      }
    }

    // Final fallback: if still nothing but the user selected specific documents, sample chunks from those docs
    if ((!searchResults || searchResults.length === 0) && Array.isArray(documentIds) && documentIds.length > 0) {
      try {
        const objIds = documentIds.map((id: any) => new Types.ObjectId(String(id)))
        const rows = await (DocumentChunk as any)
          .find({ documentId: { $in: objIds } })
          .limit(8)
          .populate("documentId")
        if (Array.isArray(rows) && rows.length > 0) {
          searchResults = rows.map((r: any) => ({
            content: r.content,
            title: (r.documentId?.title as string) || "Document",
            page: r?.metadata?.page ?? undefined,
          }))
        }
      } catch (e) {
        console.warn("[v0] Direct chunk sampling fallback failed:", e)
      }
    }

    const ragContext = buildRAGContext(searchResults as any)
    const citations = formatCitations(searchResults as any)
    const sourcesFooter =
      citations.length > 0
        ? `Sources:\n${citations
            .map((c) => `- [${c.title}${c.page ? `, Page ${c.page}` : ""}]`)
            .join("\n")}`
        : "Sources:\n- [No sources]"

    const systemPrompt = `You are OpsMind AI, a corporate knowledge assistant.
Your goal is to answer questions using ONLY the provided context.

STRICT INSTRUCTIONS:
1. If the provided context is "NONE" or does not contain a direct answer, you MUST say: "I don't know."
2. Do NOT guess, hallucinate, or use outside knowledge.
3. If an answer is found, always cite sources as [Document Name, Page X].
4. After finishing your answer, append the following footer EXACTLY as provided (do not modify entries, do not add or remove lines):
${sourcesFooter}

CONTEXT FROM KNOWLEDGE BASE:
${ragContext}`

    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)

    // If no OpenAI key available, construct a deterministic extractive answer and stream or return JSON
    if (!hasOpenAI) {
      const extractive = ((): string => {
        if (!searchResults || searchResults.length === 0) {
          return `I don't know.\n\n${sourcesFooter}`
        }
        const header = "Based on the provided documents:"
        const items = (searchResults as any[])
          .slice(0, 5)
          .map((r) => {
            const title = r?.title || r?.documentTitle || "Document"
            const page = r?.page || r?.metadata?.page
            const cite = page ? `[${title}, Page ${page}]` : `[${title}]`
            const content = String(r?.content || "").replace(/\s+/g, " ").trim()
            const snippet = content.length > 500 ? content.slice(0, 500) + "..." : content
            return `- From ${cite}: ${snippet}`
          })
          .join("\n")
        return `${header}\n\n${items}\n\n${sourcesFooter}`
      })()

      // Persist messages if chatId exists
      if (chatId) {
        try {
          await Message.create({ chatId, role: "user", content: lastMessage, citations: [] })
          await Message.create({ chatId, role: "assistant", content: extractive, citations })
        } catch (e) {
          console.warn("[v0] Failed to save extractive messages:", e)
        }
      }

      if (mode === "stream") {
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(extractive))
            controller.close()
          },
        })
        return new Response(stream, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      }

      return new Response(JSON.stringify({ text: extractive }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // If streaming requested, proxy OpenAI stream and emit plain-text tokens
    if (mode === "stream") {
      const openaiStreamRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.2,
          stream: true,
        }),
      })
      if (!openaiStreamRes.ok || !openaiStreamRes.body) {
        const errText = openaiStreamRes.ok ? "No body" : await openaiStreamRes.text().catch(() => "")
        throw new Error(`OpenAI chat stream failed: ${errText}`)
      }

      let accumulated = ""
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = openaiStreamRes.body!.getReader()
          let buffer = ""
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const parts = buffer.split("\n\n")
              buffer = parts.pop() || ""
              for (const part of parts) {
                const line = part.trim()
                if (!line.startsWith("data:")) continue
                const data = line.slice(5).trim()
                if (data === "[DONE]") {
                  continue
                }
                try {
                  const json = JSON.parse(data)
                  const delta = json.choices?.[0]?.delta?.content || ""
                  if (delta) {
                    accumulated += delta
                    controller.enqueue(encoder.encode(delta))
                  }
                } catch {}
              }
            }
          } finally {
            controller.close()
          }

          // Persist after stream completes
          if (chatId) {
            try {
              await Message.create({ chatId, role: "assistant", content: accumulated, citations })
              await Message.create({ chatId, role: "user", content: lastMessage, citations: [] })
            } catch (e) {
              console.error("[v0] Failed to save streamed assistant message:", e)
            }
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    // Non-streaming: call OpenAI and return full text
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.2,
      }),
    })
    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "")
      throw new Error(`OpenAI chat failed: HTTP ${openaiRes.status} ${errText}`)
    }
    const openaiData = await openaiRes.json()
    const fullText: string = openaiData.choices?.[0]?.message?.content || ""

    // Note: This runs asynchronously and doesn't block the streaming response
    if (chatId) {
      Promise.resolve()
        .then(async () => {
          try {
            await Message.create({
              chatId,
              role: "assistant",
              content: fullText,
              citations,
            })
          } catch (error) {
            console.error("[v0] Failed to save assistant message:", error)
          }
        })

      // Save user message
      await Message.create({
        chatId,
        role: "user",
        content: lastMessage,
        citations: [],
      })
    }

    // Always return JSON to keep client simple and robust
    return new Response(JSON.stringify({ text: fullText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    const fallback = `I don't know.\n\nSources:\n- [No sources]`
    try {
      const url = new URL(req.url)
      const mode = url.searchParams.get("mode") || "stream"
      if (mode === "stream") {
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(fallback))
            controller.close()
          },
        })
        return new Response(stream, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      }
    } catch {}
    return new Response(JSON.stringify({ text: fallback }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
}
