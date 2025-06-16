"use client"

import type React from "react"

import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, duration = 5000, showProgress = true, ...props }) => (
        <ToastWithProgress
          key={id}
          id={id}
          title={title}
          description={description}
          action={action}
          duration={duration}
          showProgress={showProgress}
          {...props}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

interface ToastWithProgressProps {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  duration: number
  showProgress: boolean
  [key: string]: any
}

function ToastWithProgress({
  id,
  title,
  description,
  action,
  duration,
  showProgress,
  ...props
}: ToastWithProgressProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!showProgress || isPaused) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [duration, showProgress, isPaused])

  return (
    <Toast
      {...props}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden"
    >
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      {action}
      <ToastClose />

      {/* Progress Bar */}
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <div
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{
              width: `${progress}%`,
              opacity: isPaused ? 0.5 : 1,
            }}
          />
        </div>
      )}
    </Toast>
  )
}
