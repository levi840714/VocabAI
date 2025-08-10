"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useVocabulary } from "@/hooks/use-vocabulary"
import { BarChart, Calendar, Award } from "lucide-react"

export default function ProgressTracker() {
  const { words } = useVocabulary()
  const [learnedPercentage, setLearnedPercentage] = useState(0)

  useEffect(() => {
    if (words.length > 0) {
      const learnedWords = words.filter((word) => word.learned)
      setLearnedPercentage((learnedWords.length / words.length) * 100)
    } else {
      setLearnedPercentage(0)
    }
  }, [words])

  const totalWords = words.length
  const learnedWords = words.filter((word) => word.learned).length
  const remainingWords = totalWords - learnedWords

  return (
    <div className="space-y-6">
      <Card className="ring-1 ring-white/60 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-sky-50/70 rounded-t-xl">
          <CardTitle className="text-slate-900">學習進度</CardTitle>
          <CardDescription>追蹤您的單字學習進度</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">總體進度</span>
                <span className="text-sm text-slate-700">
                  {learnedWords} / {totalWords} 單字
                </span>
              </div>
              <div className="rounded-lg bg-sky-50/70 p-3 ring-1 ring-sky-200/60">
                <Progress value={learnedPercentage} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="ring-1 ring-sky-200/60 bg-white/90">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center">
                    <BarChart className="h-4 w-4 mr-2 text-sky-600" />
                    總單字數
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-slate-900">{totalWords}</p>
                </CardContent>
              </Card>

              <Card className="ring-1 ring-sky-200/60 bg-white/90">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center">
                    <Award className="h-4 w-4 mr-2 text-sky-600" />
                    已學會
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-sky-700">{learnedWords}</p>
                </CardContent>
              </Card>

              <Card className="ring-1 ring-amber-200/70 bg-white/90">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                    待學習
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-amber-700">{remainingWords}</p>
                </CardContent>
              </Card>
            </div>

            {totalWords === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">添加單字以開始追蹤您的學習進度</p>
              </div>
            ) : learnedWords === totalWords ? (
              <div className="bg-sky-50/70 ring-1 ring-sky-200/60 rounded-lg p-4 text-center">
                <p className="font-medium text-sky-700">恭喜！您已學會所有單字！</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
