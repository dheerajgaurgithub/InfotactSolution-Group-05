"use client"

import { useEffect, useRef } from "react"

export function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Setup basic simulation for nodes
    const nodes = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 800,
      y: Math.random() * 500,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 5 + 3,
      label: i === 0 ? "Corporate Policy" : i === 1 ? "Employee Benefits" : i === 2 ? "IT Security" : `Doc_${i}`,
      color: i < 3 ? "oklch(0.65 0.19 230)" : "oklch(0.55 0.18 190)",
    }))

    const connections = nodes
      .map((n, i) => ({
        from: i,
        to: (i + 1) % nodes.length,
      }))
      .concat([
        { from: 0, to: 5 },
        { from: 1, to: 8 },
        { from: 2, to: 12 },
      ])

    let animationFrameId: number

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update nodes
      nodes.forEach((node) => {
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
      })

      // Draw connections
      ctx.strokeStyle = "oklch(0.25 0.02 240 / 0.3)"
      ctx.lineWidth = 1
      connections.forEach((conn) => {
        const from = nodes[conn.from]
        const to = nodes[conn.to]
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      })

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.shadowBlur = 10
        ctx.shadowColor = node.color
        ctx.fill()
        ctx.shadowBlur = 0

        // Label for primary nodes
        if (node.id < 3) {
          ctx.font = "10px sans-serif"
          ctx.fillStyle = "oklch(0.98 0.01 240)"
          ctx.fillText(node.label, node.x + 10, node.y + 3)
        }
      })

      animationFrameId = requestAnimationFrame(render)
    }

    // Set canvas size
    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }

    window.addEventListener("resize", resize)
    resize()
    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="w-full h-full bg-background/50 rounded-xl overflow-hidden cursor-crosshair border border-border/50">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] bg-background/80 px-2 py-1 rounded border border-border">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Core Concepts</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] bg-background/80 px-2 py-1 rounded border border-border">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span>Documents</span>
        </div>
      </div>
    </div>
  )
}
