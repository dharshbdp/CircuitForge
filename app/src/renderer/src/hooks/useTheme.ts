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
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return [theme, toggleTheme]
}
