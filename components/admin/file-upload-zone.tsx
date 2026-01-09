"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FileStatus {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "processing" | "completed" | "error"
  error?: string
}

export function FileUploadZone() {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFiles = (newFiles: File[]) => {
    const fileStatuses: FileStatus[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "pending",
    }))
    setFiles((prev) => [...fileStatuses, ...prev])

    fileStatuses.forEach(uploadFile)
  }

  const uploadFile = async (fileStatus: FileStatus) => {
    const formData = new FormData()
    formData.append("file", fileStatus.file)

    try {
      updateStatus(fileStatus.id, { status: "uploading", progress: 10 })

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      updateStatus(fileStatus.id, { status: "completed", progress: 100 })
      toast.success(`${fileStatus.file.name} processed and indexed`)
    } catch (error) {
      console.error("[v0] Upload error:", error)
      updateStatus(fileStatus.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to process document",
      })
      toast.error(`Failed to process ${fileStatus.file.name}`)
    }
  }

  const updateStatus = (id: string, updates: Partial<FileStatus>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-10 transition-all text-center group",
          isDragging
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT or MD (Max. 50MB)</p>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            aria-label="Upload documents"
          />
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Upload Queue
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-normal">{files.length} files</span>
          </h4>
          <div className="grid gap-3">
            {files.map((file) => (
              <Card key={file.id} className="p-4 bg-card/50 border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded bg-background border border-border flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="capitalize">{file.status}</span>
                        <span>{Math.round(file.progress)}%</span>
                      </div>
                      <Progress value={file.progress} className="h-1" />
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      {file.status === "completed" && (
                        <span className="flex items-center gap-1 text-primary">
                          <CheckCircle2 className="w-3 h-3" />
                          Indexed successfully
                        </span>
                      )}
                      {file.status === "processing" && (
                        <span className="flex items-center gap-1 text-accent">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting metadata & vectorizing...
                        </span>
                      )}
                      {file.status === "error" && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="w-3 h-3" />
                          {file.error || "Upload failed"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
