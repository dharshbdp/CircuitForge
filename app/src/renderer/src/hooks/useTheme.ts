import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cf-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cf-theme', theme)
  }, [theme])

  const toggleTheme = (): void => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> }
    }

    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.setAttribute('data-theme', nextTheme)
      setTheme(nextTheme)
      return
    }

    doc.startViewTransition(() => {
      document.documentElement.setAttribute('data-theme', nextTheme)
      setTheme(nextTheme)
    })
  }

  return [theme, toggleTheme]
}
