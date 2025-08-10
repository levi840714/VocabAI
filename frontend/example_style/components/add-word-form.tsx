"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { TextInput } from "@/components/text-input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useVocabulary } from "@/hooks/use-vocabulary"

const formSchema = z.object({
  term: z.string().min(1, { message: "單字不能為空" }),
  pronunciation: z.string().optional(),
  definition: z.string().min(1, { message: "定義不能為空" }),
  example: z.string().optional(),
})

export default function AddWordForm() {
  const { addWord } = useVocabulary()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      term: "",
      pronunciation: "",
      definition: "",
      example: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    addWord({
      id: crypto.randomUUID(),
      term: values.term,
      pronunciation: values.pronunciation || "",
      definition: values.definition,
      example: values.example || "",
      learned: false,
      dateAdded: new Date().toISOString(),
    })

    toast({
      title: "單字已添加",
      description: `"${values.term}" 已添加到您的單字列表`,
      duration: 3000,
    })

    form.reset()
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>新增單字</CardTitle>
        <CardDescription>添加新單字到您的學習列表</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="pronunciation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>發音 (選填)</FormLabel>
                    <FormControl>
                      <TextInput placeholder="例如: ㄅㄧㄢˇ ㄐㄧˋ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="definition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>定義</FormLabel>
                  <FormControl>
                    <TextInput placeholder="輸入單字定義" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="example"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>例句 (選填)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="輸入使用該單字的例句" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              添加單字
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
