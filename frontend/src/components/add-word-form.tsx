import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { TextInput } from "@/components/text-input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"
import { Sparkles, Bot, Tag } from "lucide-react"

const formSchema = z.object({
  term: z.string().min(1, { message: "單字不能為空" }),
  notes: z.string().optional(),
  category: z.string().optional(),
})

export default function AddWordForm() {
  const { addWord } = useVocabulary()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState([])
  const [suggestedCategory, setSuggestedCategory] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      term: "",
      notes: "",
      category: "uncategorized",
    },
  })

  // 載入分類列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/v1/categories', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    }
    loadCategories()
  }, [])


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) return // 防止重複提交
    
    console.log('Form submitted with values:', values)
    setIsSubmitting(true)
    
    try {
      console.log('Calling addWord with:', values.term, values.notes, values.category)
      // 在此僅傳送單字，讓 API 自動生成 AI 解釋
      await addWord(values.term, values.notes || undefined, values.category)
      
      console.log('Word added successfully')
      toast({
        title: "單字已添加",
        description: `"${values.term}" 已添加到您的單字列表，AI 正在背景為您生成解釋`,
        duration: 3000,
      })

      form.reset()
    } catch (error) {
      console.error('Add word error:', error)
      toast({
        title: "新增失敗",
        description: error instanceof Error ? error.message : "無法新增單字",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <CardTitle>新增單字</CardTitle>
        </div>
        <CardDescription className="space-y-2">
          <p>添加新單字到您的學習列表</p>
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
            <Sparkles className="w-4 h-4" />
            <span>系統將自動使用 AI 為您生成詳細的單字解釋、發音、例句和記憶技巧</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>單字</FormLabel>
                  <FormControl>
                    <TextInput placeholder="輸入單字" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    個人備註 (選填)
                    <span className="text-xs text-slate-500 dark:text-slate-400">額外的個人備註或記憶方式</span>
                  </FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Textarea 
                        placeholder="輸入您的個人備註、記憶方式或其他補充資訊（選填）" 
                        className="resize-none bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-sky-200 dark:border-slate-600 focus-visible:ring-sky-400 dark:focus-visible:ring-sky-500 min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    分類
                    {suggestedCategory && (
                      <Badge variant="secondary" className="text-xs">
                        AI建議: {suggestedCategory}
                      </Badge>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-sky-200 dark:border-slate-600">
                        <SelectValue placeholder="選擇單字分類" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="uncategorized">未分類</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.category_name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color_code }}
                            />
                            {category.category_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  正在添加中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  添加單字
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}