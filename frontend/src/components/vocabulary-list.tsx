import { useState } from "react"
import { Search, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TextInput } from "@/components/text-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"
import StructuredWordDetailsDialog from "./StructuredWordDetailsDialog"

export default function VocabularyList() {
  const { words, toggleLearned, deleteWord, loading, error, refreshWords } = useVocabulary()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWord, setSelectedWord] = useState<any>(null)
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">載入單字中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 mb-4">錯誤: {error}</p>
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
          <p className="text-slate-600">沒有找到單字。請添加新單字或修改搜尋條件。</p>
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
                {word.example && <p className="text-sm text-slate-600 italic">"{word.example}"</p>}
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWord(word)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳情
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleLearned(word.id)}
                    className="border-sky-300 text-sky-700 hover:bg-sky-100"
                  >
                    {word.learned ? "重新學習" : "標記為已學會"}
                  </Button>
                </div>
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
      
      {/* Word Details Dialog */}
      <StructuredWordDetailsDialog
        open={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        word={selectedWord ? {
          id: parseInt(selectedWord.id),
          word: selectedWord.term,
          initial_ai_explanation: selectedWord.raw_explanation,
          user_notes: selectedWord.user_notes
        } : undefined}
        onNotesUpdate={refreshWords}
      />
    </div>
  )
}