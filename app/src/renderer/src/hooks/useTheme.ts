import { useState, useEffect, useRef } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cf-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cf-theme', theme)
  }, [theme])

  const toggleTheme = (): void => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement

    // Add theme-transitioning class to trigger synchronized CSS transitions
    root.classList.add('theme-transitioning')

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current)
    }

    root.setAttribute('data-theme', nextTheme)
    setTheme(nextTheme)

    // Remove transition class after animation completes so hover/drag aren't sluggish
    transitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transitioning')
      transitionTimeoutRef.current = null
    }, 380)
  }

  return [theme, toggleTheme]
}
