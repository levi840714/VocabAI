import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-sky-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-2 text-sm text-slate-900 dark:text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-sky-600/70 dark:placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
TextInput.displayName = "TextInput"

export { TextInput }