import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@core': resolve('src/core'),
        '@hardware': resolve('src/hardware'),
        '@simulator': resolve('src/simulator'),
        '@ai': resolve('src/ai'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@core': resolve('src/core'),
        '@hardware': resolve('src/hardware'),
        '@simulator': resolve('src/simulator'),
        '@ai': resolve('src/ai'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
