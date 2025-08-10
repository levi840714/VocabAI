import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { TextInput } from "@/components/text-input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"
import { Sparkles, Bot } from "lucide-react"

const formSchema = z.object({
  term: z.string().min(1, { message: "單字不能為空" }),
  notes: z.string().optional(),
})

export default function AddWordForm() {
  const { addWord } = useVocabulary()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      term: "",
      notes: "",
    },
  })


  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Form submitted with values:', values)
    
    try {
      console.log('Calling addWord with:', values.term, values.notes)
      // 在此僅傳送單字，讓 API 自動生成 AI 解釋
      await addWord(values.term, values.notes || undefined)
      
      console.log('Word added successfully')
      toast({
        title: "單字已添加",
        description: `"${values.term}" 已添加到您的單字列表，AI 正在為您生成解釋`,
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
    }
  }

  return (
    <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm ring-1 ring-white/60">
      <CardHeader>
        <CardTitle>新增單字</CardTitle>
        <CardDescription>添加新單字到您的學習列表</CardDescription>
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
                    <span className="text-xs text-slate-500">額外的個人備註或記憶方式</span>
                  </FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Textarea 
                        placeholder="輸入您的個人備註、記憶方式或其他補充資訊（選填）" 
                        className="resize-none bg-white/70 backdrop-blur-sm border-sky-200 focus-visible:ring-sky-400 min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4 mr-2" />
              添加單字
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}