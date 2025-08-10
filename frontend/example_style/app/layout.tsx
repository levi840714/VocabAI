import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { VocabularyProvider } from "@/hooks/use-vocabulary"
import { Toaster } from "@/components/ui/toaster"
import BackgroundScene from "@/components/background-scene"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "單字學習 App",
  description: "一個幫助您學習和記憶單字的應用",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <BackgroundScene />
        <ThemeProvider attribute="class" defaultTheme="light">
          <VocabularyProvider>
            {children}
            <Toaster />
          </VocabularyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
