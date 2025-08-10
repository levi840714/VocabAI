"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Explicitly disallow 'children' and 'dangerouslySetInnerHTML'
type BaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "children" | "dangerouslySetInnerHTML">

export interface TextInputProps extends BaseProps {}

/**
 * A safe input wrapper that never renders children and never uses dangerouslySetInnerHTML.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...rest },
  ref,
) {
  // DO NOT forward children or dangerouslySetInnerHTML
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-white/50 bg-white/80 px-3 py-2 text-sm",
        "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        "focus-visible:ring-offset-2 ring-offset-white/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  )
})
