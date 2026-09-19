import { useState, useEffect } from 'react'
import type React from 'react'

export type Theme = 'dark' | 'light'

export function useTheme(): [Theme, (event?: React.MouseEvent<HTMLElement> | MouseEvent) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cf-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cf-theme', theme)
  }, [theme])

  const toggleTheme = (event?: React.MouseEvent<HTMLElement> | MouseEvent): void => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> }
    }

    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.setAttribute('data-theme', nextTheme)
      setTheme(nextTheme)
      return
    }

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2

    if (event) {
      if (event.clientX !== 0 || event.clientY !== 0) {
        x = event.clientX
        y = event.clientY
      } else if (event.currentTarget instanceof HTMLElement) {
        const rect = event.currentTarget.getBoundingClientRect()
        x = rect.left + rect.width / 2
        y = rect.top + rect.height / 2
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = doc.startViewTransition(() => {
      document.documentElement.setAttribute('data-theme', nextTheme)
      setTheme(nextTheme)
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
        },
        {
          duration: 450,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  return [theme, toggleTheme]
}
