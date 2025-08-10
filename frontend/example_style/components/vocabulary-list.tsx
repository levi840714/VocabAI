"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TextInput } from "@/components/text-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"

export default function VocabularyList() {
  const { words, toggleLearned, deleteWord } = useVocabulary()
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const filteredWords = words.filter(
    (word) =>
      word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.definition.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleToggleLearned = (id: string) => {
    toggleLearned(id)
    toast({ title: "狀態已更新", description: "單字學習狀態已更新", duration: 2000 })
  }

  const handleDelete = (id: string) => {
    if (confirm("確定要刪除這個單字嗎？")) {
      deleteWord(id)
      toast({ title: "單字已刪除", description: "單字已從您的列表中移除", duration: 2000 })
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
          <p className="text-muted-foreground">沒有找到單字。請添加新單字或修改搜尋條件。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWords.map((word) => (
            <Card
              key={word.id}
              className={[
                "transition-all bg-white/80 backdrop-blur-sm ring-1",
                word.learned ? "ring-cyan-200 bg-cyan-50/60" : "ring-white/60 hover:ring-sky-200 hover:bg-sky-50/50",
              ].join(" ")}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{word.term}</CardTitle>
                  <Badge
                    variant={word.learned ? "outline" : "secondary"}
                    className={word.learned ? "border-cyan-400 text-cyan-700" : "bg-amber-200 text-amber-900"}
                  >
                    {word.learned ? "已學會" : "學習中"}
                  </Badge>
                </div>
                {word.pronunciation && <CardDescription className="text-sm">[{word.pronunciation}]</CardDescription>}
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">{word.definition}</p>
                {word.example && <p className="text-sm text-muted-foreground italic">"{word.example}"</p>}
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleLearned(word.id)}
                  className="border-sky-300 text-sky-700 hover:bg-sky-100"
                >
                  {word.learned ? "標記為未學會" : "標記為已學會"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(word.id)}
                >
                  刪除
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
