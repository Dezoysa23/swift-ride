"use client"

import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function toInputValue(d?: Date) {
  if (!d) return ""
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

interface DatePickerProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  /** Earliest selectable date. */
  min?: Date
  /** Latest selectable date. */
  max?: Date
  className?: string
}

/** Native date field, themed to match the app's other date inputs. */
export function DatePicker({ selected, onSelect, min, max, className }: DatePickerProps) {
  return (
    <div className={cn("relative w-[240px]", className)}>
      <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="date"
        value={toInputValue(selected)}
        min={toInputValue(min)}
        max={toInputValue(max)}
        onChange={(e) =>
          onSelect?.(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)
        }
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  )
}
