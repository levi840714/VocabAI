"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Repeat, Check, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVocabulary } from "@/hooks/use-vocabulary"
import type { Word } from "@/lib/types"
import { Progress } from "@/components/ui/progress"

export default function StudyMode() {
  const { words, toggleLearned } = useVocabulary()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDefinition, setShowDefinition] = useState(false)
  const [studyWords, setStudyWords] = useState<Word[]>([])

  useEffect(() => {
    const wordsToStudy = words.filter((word) => !word.learned)
    setStudyWords(wordsToStudy.length > 0 ? wordsToStudy : words)
  }, [words])

  const handleNext = () => {
    setShowDefinition(false)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % studyWords.length)
  }

  const handlePrevious = () => {
    setShowDefinition(false)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + studyWords.length) % studyWords.length)
  }

  const handleToggleDefinition = () => setShowDefinition(!showDefinition)

  const handleMarkLearned = () => {
    if (studyWords.length > 0) {
      toggleLearned(studyWords[currentIndex].id)
      if (studyWords.length > 1) handleNext()
    }
  }

  if (studyWords.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-medium mb-2">沒有單字可學習</h3>
        <p className="text-muted-foreground mb-4">請先添加一些單字到您的列表</p>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "?tab=add")}
          className="border-sky-300 text-sky-700 hover:bg-sky-100"
        >
          添加單字
        </Button>
      </div>
    )
  }

  const currentWord = studyWords[currentIndex]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-sky-800/80">
          學習進度: {currentIndex + 1} / {studyWords.length}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStudyWords([...studyWords].sort(() => Math.random() - 0.5))}
          className="border-sky-300 text-sky-700 hover:bg-sky-100"
        >
          <Repeat className="h-4 w-4 mr-2" />
          隨機排序
        </Button>
      </div>

      <div className="rounded-xl bg-sky-50/70 p-3 mb-4 ring-1 ring-sky-200/60">
        <Progress value={((currentIndex + 1) / studyWords.length) * 100} className="h-2" />
      </div>

      <Card className="w-full h-[420px] flex flex-col ring-1 ring-white/60 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2 flex-grow">
          <CardTitle className="text-3xl mt-8">{currentWord.term}</CardTitle>
          {currentWord.pronunciation && (
            <CardDescription className="text-lg mt-2 text-slate-600">[{currentWord.pronunciation}]</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-grow flex items-center justify-center">
          {showDefinition ? (
            <div className="text-center">
              <p className="text-xl font-medium mb-4">{currentWord.definition}</p>
              {currentWord.example && <p className="text-muted-foreground italic">"{currentWord.example}"</p>}
            </div>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={handleToggleDefinition}
              className="px-8 bg-transparent border-sky-300 text-sky-700 hover:bg-sky-100"
            >
              顯示答案
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-6 pb-6 border-t bg-sky-50/60">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="border-sky-300 hover:bg-sky-100 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 text-sky-700" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="border-sky-300 hover:bg-sky-100 bg-transparent"
            >
              <ChevronRight className="h-4 w-4 text-sky-700" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              onClick={handleNext}
            >
              <X className="h-4 w-4 mr-1" />
              不認識
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-sky-700 border-sky-300 hover:bg-sky-100 bg-transparent"
              onClick={handleMarkLearned}
            >
              <Check className="h-4 w-4 mr-1" />
              已學會
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
