"use client"

import { useState } from "react"
import { Preview } from "./preview-generation"
import { ErrorGeneration } from "./error-generation"
import { FormGeneration } from "./form-generation"
import { HeaderGeneration } from "./header-generation"
import { GoogleGenAI } from "@google/genai"

interface CardSettings {
  style: string
  backgroundColor: string
  lighting: string
  pose: string
  aspectRatio: string
  userPrompt: string
}

export default function AICardGeneration() {
  const [showForm, setShowForm] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<CardSettings>({
    style: "artistic",
    backgroundColor: "studio",
    lighting: "studio",
    pose: "profile",
    aspectRatio: "4:5",
    userPrompt: "",
  })
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowForm(false)
    setIsLoading(true)
    setError(null)

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("API key is not configured. Please check your environment variables.")
      }

      if (!settings.userPrompt.trim()) {
        throw new Error("Please provide a description for the image you want to generate.")
      }

      // Initialize the client inside the function
      const ai = new GoogleGenAI({
        apiKey: apiKey,
      })

      // Use the user's prompt
      const prompt = {
        role: "user",
        parts: [{
          text: settings.userPrompt
        }]
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: [prompt],
        config: {
          responseModalities: ["Text", "Image"],
        },
      })

      // Type check the response
      if (!response || typeof response !== 'object' || !('candidates' in response)) {
        throw new Error("Invalid response format from Gemini API")
      }

      const candidates = response.candidates
      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error("No candidates found in response")
      }

      const firstCandidate = candidates[0]
      if (!firstCandidate?.content?.parts) {
        throw new Error("Invalid candidate format")
      }

      // Find the image part in the response
      const imagePart = firstCandidate.content.parts.find((part: any) => part.inlineData)
      if (!imagePart?.inlineData?.data) {
        throw new Error("No image data found in response")
      }

      const imageData = imagePart.inlineData.data
      const imageUrl = `data:image/jpeg;base64,${imageData}`
      setGeneratedImageUrl(imageUrl)
      
    } catch (err) {
      console.error("Error generating image:", err)
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          setError("API key is invalid or not properly configured. Please check your API key settings.")
        } else if (err.message.includes("API key is not configured")) {
          setError("API key is not configured. Please check your environment variables.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to generate image. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToSettings = () => {
    setShowForm(true)
    setError(null)
  }

  const handleDownload = () => {
    if (!generatedImageUrl) return

    // Create a temporary link element
    const link = document.createElement('a')
    link.href = generatedImageUrl
    link.download = 'generated-portrait.jpg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="group relative overflow-hidden w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] min-h-[500px] flex flex-col justify-between gap-2">
      <HeaderGeneration />
      <div className="flex-1 overflow-hidden flex flex-col">
        {error && <ErrorGeneration error={error} />}
        <div className="flex flex-1">
          <div className="flex-1 p-4 border-r border-zinc-200 dark:border-zinc-800">
            <FormGeneration onSubmit={handleSubmit} settings={settings} onSettingsChange={setSettings} />
          </div>
          <div className="flex-1 p-4">
            <Preview
              isLoading={isLoading}
              imageUrl={generatedImageUrl || "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/profile-mjss82WnWBRO86MHHGxvJ2TVZuyrDv.jpeg"}
            />

            {!isLoading && generatedImageUrl && (
              <div className="space-y-4">
                <div className="p-3 space-y-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Quality</span>
                    <span className="text-zinc-900 dark:text-zinc-100">1080p</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Duration</span>
                    <span className="text-zinc-900 dark:text-zinc-100">00:07</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!generatedImageUrl}
                    className="w-full h-9 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

