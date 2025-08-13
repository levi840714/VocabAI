import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TextInput } from "@/components/text-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"

interface VocabularyListProps {
  onAIAnalysisClick?: (word: string) => void;
}

export default function VocabularyList({ onAIAnalysisClick }: VocabularyListProps) {
  const { words, toggleLearned, deleteWord, loading, error, refreshWords } = useVocabulary()
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">載入單字中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 dark:text-red-400 mb-4">錯誤: {error}</p>
        <Button onClick={refreshWords} variant="outline">重新載入</Button>
      </div>
    )
  }

  const filteredWords = words.filter(
    (word) =>
      word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.definition.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleToggleLearned = async (id: string) => {
    try {
      await toggleLearned(id)
      toast({ title: "狀態已更新", description: "單字學習狀態已更新", duration: 2000 })
    } catch (err) {
      toast({ title: "錯誤", description: "無法更新單字狀態", duration: 3000, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("確定要刪除這個單字嗎？")) {
      try {
        await deleteWord(id)
        toast({ title: "單字已刪除", description: "單字已從您的列表中移除", duration: 2000 })
      } catch (err) {
        toast({ title: "錯誤", description: "無法刪除單字", duration: 3000, variant: "destructive" })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sky-600" />
        <TextInput
          type="search"
          placeholder="搜尋單字或定義..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredWords.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-600 dark:text-slate-300">沒有找到單字。請添加新單字或修改搜尋條件。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWords.map((word) => (
            <Card
              key={word.id}
              className={[
                "transition-all bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1",
                word.learned ? "ring-cyan-200 dark:ring-cyan-600 bg-cyan-50/60 dark:bg-cyan-900/20" : "ring-white/60 dark:ring-slate-600 hover:ring-sky-200 dark:hover:ring-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/30",
              ].join(" ")}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{word.term}</CardTitle>
                  <Badge
                    variant={word.learned ? "outline" : "secondary"}
                    className={word.learned ? "border-cyan-400 dark:border-cyan-500 text-cyan-700 dark:text-cyan-300" : "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"}
                  >
                    {word.learned ? "已學會" : "學習中"}
                  </Badge>
                </div>
                {word.pronunciation && <CardDescription className="text-sm">[{word.pronunciation}]</CardDescription>}
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2 text-slate-900 dark:text-slate-100">{word.definition}</p>
                {word.example && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{word.example}"</p>}
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/vocabulary/${word.id}`)}
                    className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳情
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleLearned(word.id)}
                    className="bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                  >
                    {word.learned ? "重新學習" : "標記為已學會"}
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                    onClick={() => handleDelete(word.id)}
                    title="刪除單字"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}