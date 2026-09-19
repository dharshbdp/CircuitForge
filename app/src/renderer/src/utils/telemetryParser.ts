// app/src/renderer/src/utils/telemetryParser.ts

export interface TelemetryDataPoint {
  timestamp: number // Milliseconds (Date.now())
  values: Record<string, number> // e.g. { temp: 24.5, hum: 60 }
}

export function parseTelemetryLine(line: string): Record<string, number> | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // 1. Try parsing JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      const result: Record<string, number> = {}
      for (const [key, val] of Object.entries(parsed)) {
        const num = Number(val)
        if (!isNaN(num)) result[key] = num
      }
      if (Object.keys(result).length > 0) return result
    } catch {
      // Fall through to other formats
    }
  }

  // 2. Try Key-Value pairs (e.g., "temp: 24.5, hum: 60" or "temp=24.5;hum=60")
  const kvRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)/g
  const kvMatches = [...trimmed.matchAll(kvRegex)]
  if (kvMatches.length > 0) {
    const result: Record<string, number> = {}
    for (const match of kvMatches) {
      result[match[1]] = parseFloat(match[2])
    }
    return result
  }

  // 3. Try CSV numbers (Arduino Serial Plotter style: "1023, 512, 256")
  const parts = trimmed.split(/[,\t ]+/).filter(Boolean)
  if (parts.length > 0 && parts.every((p) => !isNaN(Number(p)))) {
    const result: Record<string, number> = {}
    parts.forEach((p, idx) => {
      result[`channel_${idx + 1}`] = parseFloat(p)
    })
    return result
  }

  return null
}
