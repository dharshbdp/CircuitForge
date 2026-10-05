import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type {
  ExplainCircuitRequest,
  CircuitExplanation,
  WiringStep,
  AiApiKeyStatus,
  BlockSynthesisRequest,
  BlockSynthesisResult,
  AiTranspileRequest,
  AiTranspileResult
} from '@shared/types'
import { getBoardById } from '../../hardware'
import { getBlockSchemaPrompt, synthesizeOfflineIntent } from '../../core'
import { parseCppToBlocks } from '../../core/parser/cppParser'

interface ConfigData {
  geminiApiKey?: string
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'circuitforge_ai_config.json')
}

function loadConfig(): ConfigData {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Failed to load AI config:', err)
  }
  return {}
}

function saveConfig(data: ConfigData): boolean {
  try {
    const configPath = getConfigPath()
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('Failed to save AI config:', err)
    return false
  }
}

let cachedApiKey: string | null = null

export function getAiApiKey(): string | null {
  if (cachedApiKey) return cachedApiKey
  const cfg = loadConfig()
  if (cfg.geminiApiKey) {
    cachedApiKey = cfg.geminiApiKey
    return cachedApiKey
  }
  return null
}

export function setAiApiKey(apiKey: string): boolean {
  const clean = apiKey.trim()
  cachedApiKey = clean || null
  return saveConfig({ geminiApiKey: clean })
}

export function getAiApiKeyStatus(): AiApiKeyStatus {
  const key = getAiApiKey()
  if (!key) {
    return { isConfigured: false }
  }
  const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****'
  return {
    isConfigured: true,
    maskedKey: masked
  }
}

/**
 * Deterministic offline hardware explainer and wiring generator.
 * Works with 100% reliability offline without external API access.
 */
export function generateOfflineExplanation(request: ExplainCircuitRequest): CircuitExplanation {
  const board = getBoardById(request.boardId)
  const boardName = board?.name || 'Microcontroller Board'
  const is3v3 =
    board?.voltage === 3.3 || request.boardId.includes('esp') || request.boardId.includes('pico')
  const code = request.code || ''

  const wiringTable: WiringStep[] = []
  const logicFlow: string[] = []
  const powerNotes: string[] = [
    'Common Ground: Ensure all external sensors and power supplies share a unified GND rail with the microcontroller.',
    `Operating Voltage: ${boardName} operates at ${is3v3 ? '3.3V logic' : '5V logic'}.`
  ]

  if (is3v3) {
    powerNotes.push(
      'Level Shifting: 5V-only sensors (e.g. standard HC-SR04, 5V MQ-2) require a resistor voltage divider or logic level converter before connecting to 3.3V GPIO pins to prevent gate damage.'
    )
  }

  // 1. Detect Ultrasonic HC-SR04
  const ultraMatch = code.match(/readUltrasonicDistance\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (ultraMatch) {
    const trig = ultraMatch[1]
    const echo = ultraMatch[2]
    wiringTable.push(
      {
        component: 'HC-SR04 Ultrasonic',
        componentPin: 'VCC',
        boardPin: '5V',
        wireColor: 'Red',
        notes: 'Powers the sonic transducer'
      },
      {
        component: 'HC-SR04 Ultrasonic',
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'Ground connection'
      },
      {
        component: 'HC-SR04 Ultrasonic',
        componentPin: 'Trig',
        boardPin: `Pin ${trig}`,
        wireColor: 'Yellow',
        notes: '10µs trigger pulse output'
      },
      {
        component: 'HC-SR04 Ultrasonic',
        componentPin: 'Echo',
        boardPin: `Pin ${echo}`,
        wireColor: 'Green',
        notes: is3v3
          ? 'Pulse return (Use 1kΩ/2kΩ voltage divider to scale 5V down to 3.3V)'
          : 'Pulse width return signal'
      }
    )
    logicFlow.push(
      `Measures object distance via the HC-SR04 sensor by emitting an ultrasonic pulse on Pin ${trig} and timing the echo return on Pin ${echo}.`
    )
  }

  // 2. Detect Servo Motor
  const servoMatch =
    code.match(/servo_(\w+)\.attach\s*\(\s*(\d+)\s*\)/i) ||
    code.match(/\.attach\s*\(\s*(\d+)\s*\)/i)
  if (servoMatch) {
    const pin = servoMatch[1]
    wiringTable.push(
      {
        component: 'Servo Motor',
        componentPin: 'VCC (+)',
        boardPin: '5V (External Recommended)',
        wireColor: 'Red',
        notes: 'Servos draw high stall current; external 5V/2A supply recommended for smooth motion'
      },
      {
        component: 'Servo Motor',
        componentPin: 'GND (-)',
        boardPin: 'GND',
        wireColor: 'Brown / Black',
        notes: 'Must tie to microcontroller ground'
      },
      {
        component: 'Servo Motor',
        componentPin: 'Signal (PWM)',
        boardPin: `Pin ${pin}`,
        wireColor: 'Orange / Yellow',
        notes: '50Hz PPM position control pulse'
      }
    )
    powerNotes.push(
      'Servo Inductive Spikes: Servos can cause brownout resets if powered directly from USB. Use an external 5V battery or DC supply with shared GND.'
    )
    logicFlow.push(
      `Actuates a servo horn on Pin ${pin} to position mechanical elements based on control logic.`
    )
  }

  // 3. Detect DHT11 / DHT22 Sensor
  const dhtMatch = code.match(/DHT\s+dht_\w+\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)/i)
  if (dhtMatch) {
    const pin = dhtMatch[1]
    const model = dhtMatch[2]
    wiringTable.push(
      {
        component: `${model} Sensor`,
        componentPin: 'VCC',
        boardPin: is3v3 ? '3.3V' : '5V',
        wireColor: 'Red',
        notes: 'Operating supply'
      },
      {
        component: `${model} Sensor`,
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'Ground reference'
      },
      {
        component: `${model} Sensor`,
        componentPin: 'Data',
        boardPin: `Pin ${pin}`,
        wireColor: 'Blue / Yellow',
        notes: 'Single-wire bidirectional bus (bare sensors require 10kΩ pull-up resistor to VCC)'
      }
    )
    logicFlow.push(
      `Polls ambient temperature and relative humidity digitally via the ${model} on Pin ${pin}.`
    )
  }

  // 4. Detect Relay Module
  const relayMatch =
    code.match(/pinMode\s*\(\s*(\d+)\s*,\s*OUTPUT\s*\);[\s\S]*?relay/i) ||
    code.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\);[\s\S]*?relay/i)
  if (relayMatch) {
    const pin = relayMatch[1]
    wiringTable.push(
      {
        component: 'Relay Module',
        componentPin: 'VCC',
        boardPin: '5V',
        wireColor: 'Red',
        notes: 'Optocoupler & coil power'
      },
      {
        component: 'Relay Module',
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'Ground'
      },
      {
        component: 'Relay Module',
        componentPin: 'IN',
        boardPin: `Pin ${pin}`,
        wireColor: 'Yellow',
        notes: 'Switch trigger signal'
      }
    )
    logicFlow.push(`Switches an isolated electrical relay circuit on Pin ${pin}.`)
  }

  // 5. Detect WS2812B NeoPixel Strip
  const neoMatch = code.match(/Adafruit_NeoPixel\s+strip_\w+\s*\(\s*(\d+)\s*,\s*(\d+)/i)
  if (neoMatch) {
    const count = neoMatch[1]
    const pin = neoMatch[2]
    wiringTable.push(
      {
        component: 'NeoPixel Strip',
        componentPin: '5V / VDD',
        boardPin: '5V',
        wireColor: 'Red',
        notes: `Powers ${count} RGB LEDs (~60mA per pixel at full white)`
      },
      {
        component: 'NeoPixel Strip',
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'Ground reference'
      },
      {
        component: 'NeoPixel Strip',
        componentPin: 'DIN (Data In)',
        boardPin: `Pin ${pin}`,
        wireColor: 'Green',
        notes: 'High-speed NRZ 800kHz data signal (330Ω - 470Ω series resistor recommended)'
      }
    )
    powerNotes.push(
      `NeoPixel Current: A strip with ${count} pixels can draw up to ${(Number(count) * 0.06).toFixed(2)}A at full brightness. Connect external 5V power if exceeding 8 pixels.`
    )
    logicFlow.push(
      `Drives a chain of ${count} individually addressable RGB LEDs via 800kHz serial on Pin ${pin}.`
    )
  }

  // 6. Detect MQ-2 Gas / Smoke Sensor
  const mqMatch =
    code.match(/analogRead\s*\(\s*(A\d+|\d+)\s*\)[\s\S]*?MQ/i) || code.match(/sensor_mq2/i)
  if (mqMatch) {
    const pin = mqMatch[1] || 'A0'
    wiringTable.push(
      {
        component: 'MQ-2 Gas Sensor',
        componentPin: 'VCC',
        boardPin: '5V',
        wireColor: 'Red',
        notes: 'Internal heating element requires solid 5V/150mA'
      },
      {
        component: 'MQ-2 Gas Sensor',
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'Ground reference'
      },
      {
        component: 'MQ-2 Gas Sensor',
        componentPin: 'AOUT',
        boardPin: pin.startsWith('A') ? pin : `Pin ${pin}`,
        wireColor: 'Yellow',
        notes: 'Analog voltage proportional to smoke/gas concentration'
      }
    )
    powerNotes.push(
      'MQ-2 Pre-heating: The MQ-2 internal sensor coil gets warm and requires 20-30 seconds of stabilization before readings become accurate.'
    )
    logicFlow.push(
      `Samples atmospheric gas and smoke levels using the analog sensor input on ${pin}.`
    )
  }

  // 7. Detect Digital Write (LED / Buzzer)
  const dwMatches = [
    ...code.matchAll(
      /pinMode\s*\(\s*(\d+)\s*,\s*OUTPUT\s*\);\s*[\s\S]*?digitalWrite\s*\(\s*\1\s*,\s*(HIGH|LOW)\s*\);/gi
    )
  ]
  for (const m of dwMatches) {
    const pin = m[1]
    // Don't duplicate if already added
    if (!wiringTable.some((w) => w.boardPin.includes(pin))) {
      wiringTable.push(
        {
          component: `LED / Buzzer (Pin ${pin})`,
          componentPin: 'Anode (+)',
          boardPin: `Pin ${pin}`,
          wireColor: 'Yellow',
          notes: 'Connect in series through a 220Ω - 330Ω current-limiting resistor'
        },
        {
          component: `LED / Buzzer (Pin ${pin})`,
          componentPin: 'Cathode (-)',
          boardPin: 'GND',
          wireColor: 'Black',
          notes: 'Ground return'
        }
      )
      logicFlow.push(`Toggles digital output on Pin ${pin} to signal states or drive an indicator.`)
    }
  }

  // 8. Detect Analog Write (PWM Dimmer / Motor)
  const awMatches = [...code.matchAll(/analogWrite\s*\(\s*(\d+)\s*,\s*([^)]+)\s*\)/gi)]
  for (const m of awMatches) {
    const pin = m[1]
    if (!wiringTable.some((w) => w.boardPin.includes(pin))) {
      wiringTable.push({
        component: `PWM Device (Pin ${pin})`,
        componentPin: 'Signal',
        boardPin: `Pin ${pin}`,
        wireColor: 'Yellow',
        notes: 'PWM duty cycle modulated signal'
      })
      logicFlow.push(`Modulates PWM pulse width on Pin ${pin} for smooth analog control.`)
    }
  }

  // Fallback if no specific components matched
  if (wiringTable.length === 0) {
    wiringTable.push(
      {
        component: 'Board Power',
        componentPin: 'VIN / USB',
        boardPin: '5V',
        wireColor: 'Red',
        notes: 'Primary power supply'
      },
      {
        component: 'Board Ground',
        componentPin: 'GND',
        boardPin: 'GND',
        wireColor: 'Black',
        notes: 'System ground'
      }
    )
    logicFlow.push('Executes core microcontroller setup and control loop operations.')
  }

  const summary = `CircuitForge visual firmware tailored for the ${boardName}. The design integrates ${wiringTable.length > 2 ? `${wiringTable.length} connection points across multiple hardware peripherals` : 'basic microcontroller I/O'} with automated setup and continuous monitoring in the loop routine.`

  return {
    summary,
    logicFlow,
    wiringTable,
    powerNotes,
    isAiGenerated: false
  }
}

/**
 * Calls Google Gemini API with structured prompt for deep circuit explanation.
 * Falls back to deterministic offline explanation if no API key or on error.
 */
export async function explainCircuitWithAi(
  request: ExplainCircuitRequest
): Promise<CircuitExplanation> {
  const apiKey = getAiApiKey()

  // If no API key configured, use the deterministic offline engine
  if (!apiKey) {
    return generateOfflineExplanation(request)
  }

  const board = getBoardById(request.boardId)
  const boardName = board?.name || 'Microcontroller Board'
  const voltage = board ? `${board.voltage}V` : '5V'

  const systemInstruction = `You are CircuitForge Copilot, an expert embedded systems engineer, electrical engineer, and Arduino firmware specialist.
Your task is to analyze visual microcontroller firmware (Arduino C++) and produce:
1. A concise executive summary of what the circuit does.
2. A numbered logic flow explaining step-by-step how sensor inputs trigger actuator outputs.
3. A complete, precise breadboard wiring table with component names, component pins, board pins, recommended wire colors (Red for VCC/5V/3.3V, Black/Brown for GND, Yellow/Green/Blue/Orange for Signal/Data), and critical technical notes (e.g. 220Ω resistor for LEDs, 10k pull-up for DHT, voltage divider for 3.3V boards, external power for servos).
4. Power & Safety Notes (level shifting, brownout prevention, current limits).

Target Board: ${boardName} (${voltage} logic).

Return your response ONLY as valid JSON conforming strictly to this JSON schema:
{
  "summary": "string",
  "logicFlow": ["string"],
  "wiringTable": [
    {
      "component": "string",
      "componentPin": "string",
      "boardPin": "string",
      "wireColor": "string",
      "notes": "string"
    }
  ],
  "powerNotes": ["string"]
}`

  const userPrompt = `Analyze this embedded sketch for ${boardName}:\n\n\`\`\`cpp\n${request.code}\n\`\`\``

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const body = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`Gemini API returned error ${res.status}:`, errText)
      const offline = generateOfflineExplanation(request)
      offline.error = `Gemini API error (${res.status}). Displaying offline hardware analysis.`
      return offline
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    const parsed = JSON.parse(text)
    return {
      summary: parsed.summary || 'Circuit logic explanation generated by CircuitForge Copilot.',
      logicFlow: Array.isArray(parsed.logicFlow) ? parsed.logicFlow : [],
      wiringTable: Array.isArray(parsed.wiringTable) ? parsed.wiringTable : [],
      powerNotes: Array.isArray(parsed.powerNotes) ? parsed.powerNotes : [],
      isAiGenerated: true
    }
  } catch (err) {
    console.warn('AI Explanation call failed, falling back to offline engine:', err)
    const offline = generateOfflineExplanation(request)
    offline.error = `AI connection failed (${err instanceof Error ? err.message : String(err)}). Displaying offline hardware analysis.`
    return offline
  }
}

/**
 * Synthesizes visual Blockly blocks and Arduino C++ from natural language prompts.
 * Uses Gemini API when configured and online, with seamless deterministic offline fallback.
 */
export async function synthesizeBlocks(
  request: BlockSynthesisRequest
): Promise<BlockSynthesisResult> {
  const apiKey = getAiApiKey()

  // If no API key configured, use the deterministic offline intent engine
  if (!apiKey) {
    const offline = synthesizeOfflineIntent(request.prompt, request.boardId)
    return {
      success: true,
      explanation: offline.explanation,
      blocks: offline.blocks as unknown as Record<string, unknown>[],
      cppCode: offline.cppCode,
      source: 'offline'
    }
  }

  const board = getBoardById(request.boardId)
  const boardName = board?.name || 'Microcontroller Board'
  const voltage = board ? `${board.voltage}V` : '5V'

  const schemaGuidelines = getBlockSchemaPrompt()

  const systemInstruction = `You are CircuitForge Synthesizer, an expert embedded firmware generator and visual programming architect.
Your task is to convert the user's natural language requirements into:
1. "explanation": A clear, technical explanation of what logic you designed, which pins were chosen, and how the program runs.
2. "cppCode": Fully working, compilable Arduino C++ code matching the logic.
3. "blocks": An array of top-level Blockly AST nodes connected via "next" properties and inputs conforming to CircuitForge's block taxonomy.

Target Board: ${boardName} (${voltage} logic).

${schemaGuidelines}

Output JSON Schema:
{
  "explanation": "string",
  "cppCode": "string",
  "blocks": [
    {
      "type": "string",
      "fields": {},
      "inputs": {},
      "next": {}
    }
  ]
}

Return ONLY valid JSON matching this schema.`

  const userPrompt = `Synthesize microcontroller logic for ${boardName}:\n"${request.prompt}"`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const body = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 14000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`Gemini API synthesis error ${res.status}:`, errText)
      const offline = synthesizeOfflineIntent(request.prompt, request.boardId)
      return {
        success: true,
        explanation: `${offline.explanation} (Note: Gemini API returned ${res.status}; synthesized via offline rule engine)`,
        blocks: offline.blocks as unknown as Record<string, unknown>[],
        cppCode: offline.cppCode,
        source: 'offline',
        warnings: [`Cloud AI returned status ${res.status}. Used deterministic offline synthesis.`]
      }
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    const parsed = JSON.parse(text)
    let blocks = Array.isArray(parsed.blocks) ? parsed.blocks : []

    // If blocks are empty or not provided directly by LLM, compile the generated C++ using our battle-tested parser!
    if (blocks.length === 0 && parsed.cppCode) {
      const parseRes = parseCppToBlocks(parsed.cppCode)
      if (parseRes.success && parseRes.blocks.length > 0) {
        blocks = parseRes.blocks
      }
    }

    // If still no blocks, fallback to offline intent synthesizer
    if (blocks.length === 0) {
      const offline = synthesizeOfflineIntent(request.prompt, request.boardId)
      return {
        success: true,
        explanation: offline.explanation,
        blocks: offline.blocks as unknown as Record<string, unknown>[],
        cppCode: offline.cppCode,
        source: 'offline',
        warnings: [
          'Synthesized via offline engine due to incomplete block structure from cloud model.'
        ]
      }
    }

    return {
      success: true,
      explanation: parsed.explanation || 'Visual blocks and C++ firmware synthesized successfully.',
      blocks,
      cppCode: parsed.cppCode || '',
      source: 'gemini'
    }
  } catch (err) {
    console.warn('AI Synthesis call failed, falling back to offline engine:', err)
    const offline = synthesizeOfflineIntent(request.prompt, request.boardId)
    return {
      success: true,
      explanation: `${offline.explanation} (Synthesized via deterministic offline engine)`,
      blocks: offline.blocks as unknown as Record<string, unknown>[],
      cppCode: offline.cppCode,
      source: 'offline',
      warnings: [
        `Cloud connection failed (${err instanceof Error ? err.message : String(err)}). Used offline engine.`
      ]
    }
  }
}

/**
 * Recursively counts raw fallback blocks ('raw_cpp_code') in a Blockly blocks tree.
 */
export function countRawSnippets(blocks: Record<string, unknown>[]): number {
  let count = 0
  function visit(b: Record<string, unknown>): void {
    if (!b) return
    if (b.type === 'raw_cpp_code') count++
    if (b.inputs && typeof b.inputs === 'object') {
      for (const key of Object.keys(b.inputs)) {
        const inp = (b.inputs as Record<string, unknown>)[key] as Record<string, unknown>
        if (inp?.block) visit(inp.block as Record<string, unknown>)
        if (inp?.shadow) visit(inp.shadow as Record<string, unknown>)
      }
    }
    if (b.next && typeof b.next === 'object') {
      const nextObj = b.next as Record<string, unknown>
      if (nextObj.block) visit(nextObj.block as Record<string, unknown>)
    }
  }
  for (const b of blocks) visit(b)
  return count
}

/**
 * Extracts recognized embedded hardware peripherals and pin assignments from C++ code.
 * Automatically resolves constants, #define macros, and variable pin definitions.
 */
export function extractHardwareComponentsFromCode(code: string): string[] {
  const components: string[] = []
  const pinVars = new Map<string, string>()

  // 1. Scan #define macros and const/int variable declarations
  const defineMatches = code.matchAll(/#define\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)/g)
  for (const m of defineMatches) {
    pinVars.set(m[1], m[2])
  }

  const varMatches = code.matchAll(
    /(?:const\s+)?(?:int|uint8_t|byte)\s+([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_]+)\s*;/g
  )
  for (const m of varMatches) {
    pinVars.set(m[1], m[2])
  }

  const resolvePin = (p: string): string => {
    const clean = p.trim().replace(/^['"]|['"]$/g, '')
    return pinVars.get(clean) || clean
  }

  // Ultrasonic HC-SR04
  const ultra =
    code.match(/readUltrasonicDistance\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*\)/i) ||
    code.match(/new\s+NewPing\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)/i)
  if (ultra) {
    const trig = resolvePin(ultra[1])
    const echo = resolvePin(ultra[2])
    components.push(`HC-SR04 Ultrasonic (Trig Pin ${trig}, Echo Pin ${echo})`)
  } else {
    const trigMatch = code.match(/(?:trig|trigger)\w*\s*=\s*([A-Za-z0-9_]+)/i)
    const echoMatch = code.match(/(?:echo)\w*\s*=\s*([A-Za-z0-9_]+)/i)
    if (trigMatch && echoMatch) {
      const trig = resolvePin(trigMatch[1])
      const echo = resolvePin(echoMatch[1])
      components.push(`HC-SR04 Ultrasonic (Trig Pin ${trig}, Echo Pin ${echo})`)
    }
  }

  // Servo
  const servoAttach = [...code.matchAll(/([A-Za-z0-9_]+)\.attach\s*\(\s*([A-Za-z0-9_]+)\s*\)/gi)]
  for (const m of servoAttach) {
    const pin = resolvePin(m[2])
    components.push(`Servo Motor "${m[1]}" (Pin ${pin})`)
  }

  // DHT Sensor
  const dhtMatch = code.match(
    /DHT\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*\)/i
  )
  if (dhtMatch) {
    const pin = resolvePin(dhtMatch[2])
    const model = resolvePin(dhtMatch[3])
    components.push(`${model} Temp/Humidity Sensor (Pin ${pin})`)
  }

  // NeoPixel
  const neoMatch = code.match(
    /Adafruit_NeoPixel\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)/i
  )
  if (neoMatch) {
    const count = resolvePin(neoMatch[2])
    const pin = resolvePin(neoMatch[3])
    components.push(`WS2812B NeoPixel Strip (${count} LEDs on Pin ${pin})`)
  }

  // LiquidCrystal / OLED
  const lcdMatch = code.match(
    /LiquidCrystal_I2C\s+([A-Za-z0-9_]+)\s*\(\s*(0x[0-9a-fA-F]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i
  )
  if (lcdMatch) {
    components.push(`I2C LCD Display (${lcdMatch[3]}x${lcdMatch[4]} at ${lcdMatch[2]})`)
  }

  // Relay
  const relayMatch = code.match(/(?:relay|switch|fan|pump|valve)\w*\s*=\s*([A-Za-z0-9_]+)/i)
  if (relayMatch) {
    const pin = resolvePin(relayMatch[1])
    components.push(`Relay Module (Pin ${pin})`)
  }

  // Analog / LDR / MQ-2
  const analogReads = [...code.matchAll(/analogRead\s*\(\s*([A-Za-z0-9_]+)\s*\)/gi)]
  for (const m of analogReads) {
    const pin = resolvePin(m[1])
    if (!components.some((c) => c.includes(`Pin ${pin}`))) {
      components.push(`Analog Sensor Input (Pin ${pin})`)
    }
  }

  // PWM writes
  const pwmWrites = [...code.matchAll(/analogWrite\s*\(\s*([A-Za-z0-9_]+)\s*,/gi)]
  for (const m of pwmWrites) {
    const pin = resolvePin(m[1])
    if (!components.some((c) => c.includes(`Pin ${pin}`))) {
      components.push(`PWM Actuator Output (Pin ${pin})`)
    }
  }

  // Digital writes
  const digWrites = [...code.matchAll(/digitalWrite\s*\(\s*([A-Za-z0-9_]+)\s*,/gi)]
  for (const m of digWrites) {
    const pin = resolvePin(m[1])
    if (!components.some((c) => c.includes(`Pin ${pin}`))) {
      components.push(`Digital Output (Pin ${pin})`)
    }
  }

  return components
}

/**
 * Extracts baud rate if Serial.begin(rate) is present in code.
 */
function extractBaudRate(code: string): number | undefined {
  const match = code.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/i)
  if (match) {
    const val = parseInt(match[1], 10)
    if (!isNaN(val) && val > 0) return val
  }
  return undefined
}

/**
 * Deterministic offline C++ to Blockly transpiler.
 * Performs AST extraction, peripheral mapping, and raw code snippet preservation.
 */
export function transpileOfflineSketch(code: string, boardId: string): AiTranspileResult {
  const parseResult = parseCppToBlocks(code)
  const components = extractHardwareComponentsFromCode(code)
  const baudRate = parseResult.baudRate || extractBaudRate(code)
  const rawSnippetsCount = countRawSnippets(
    parseResult.blocks as unknown as Record<string, unknown>[]
  )

  const board = getBoardById(boardId)
  const boardName = board?.name || 'Microcontroller Board'

  const totalBlocks = parseResult.blocks.length
  const nativeBlocks = Math.max(0, totalBlocks - rawSnippetsCount)

  const explanation =
    `Transpiled sketch into ${totalBlocks} visual block${totalBlocks === 1 ? '' : 's'} (${nativeBlocks} native visual blocks, ${rawSnippetsCount} raw fallback snippet${rawSnippetsCount === 1 ? '' : 's'}) for ${boardName}. ` +
    (components.length > 0
      ? `Identified ${components.length} hardware peripheral${components.length === 1 ? '' : 's'}: ${components.join(', ')}.`
      : 'Extracted embedded control flow, timing, and logic structures.')

  return {
    success: parseResult.success,
    blocks: parseResult.blocks as unknown as Record<string, unknown>[],
    explanation,
    mappedComponents: components,
    unmappedSnippetsCount: rawSnippetsCount,
    detectedBaudRate: baudRate,
    source: 'offline',
    warnings: parseResult.warnings
  }
}

/**
 * LLM-Assisted Full C++ to Block Transpilation (Milestone v0.7 Phase 16).
 * Accepts arbitrary, multi-function, or multi-library Arduino sketches,
 * maps high-level structures into visual blocks, and wraps irreducible code
 * in raw_cpp_code blocks.
 */
export async function transpileSketchWithAi(
  request: AiTranspileRequest
): Promise<AiTranspileResult> {
  const apiKey = getAiApiKey()

  // Fallback to deterministic offline transpiler if no API key is available
  if (!apiKey) {
    return transpileOfflineSketch(request.code, request.boardId)
  }

  const board = getBoardById(request.boardId)
  const boardName = board?.name || 'Microcontroller Board'
  const voltage = board ? `${board.voltage}V` : '5V'

  const schemaGuidelines = getBlockSchemaPrompt()

  const systemInstruction = `You are CircuitForge AI Transpiler, an expert reverse engineering compiler that converts full, arbitrary Arduino C++ sketches into structured visual Blockly block programs.
Your goal is to parse and convert complex external Arduino sketches (including sketches with custom libraries like Adafruit_NeoPixel, Servo, DHT, LiquidCrystal, multiple functions, custom control state machines, and timer loops) into valid, clean CircuitForge visual blocks.

${schemaGuidelines}

TRANSPILATION RULES:
1. Deconstruct the program into structured Blockly blocks:
   - Identify peripheral pins (Trig/Echo for Ultrasonic, data pin for DHT, PWM pin for Servos or LEDs, relay pins, I/O pins) and initialize them.
   - Convert 'digitalWrite', 'analogWrite', 'digitalRead', 'analogRead', 'delay', 'delayMicroseconds', 'millis', and 'Serial.print/println' into their native block representations.
   - Convert sensor readings ('sensor_dht', 'sensor_ultrasonic', 'sensor_light_ldr', 'sensor_pir', 'sensor_mq2_read') into corresponding sensor blocks.
   - Convert servo angle commands ('actuator_servo') and NeoPixel commands ('neopixel_init', 'neopixel_set_color', 'neopixel_clear').
   - Convert control structures ('if/else', 'for', 'while') and comparisons.
2. For custom helper functions, complex third-party library classes, or lines that cannot be cleanly expressed by standard blocks, wrap each specific unmapped statement into a "raw_cpp_code" block with a descriptive comment.
3. Preserve the logical execution flow of the sketch so that transpiling these blocks back to C++ yields equivalent firmware behavior.
4. Output MUST be ONLY valid JSON adhering to this schema:
{
  "explanation": "Human-friendly summary of the transpiled program architecture and peripheral mapping",
  "mappedComponents": ["Component Description (e.g. Servo Motor on Pin 9)", ...],
  "detectedBaudRate": 9600,
  "blocks": [
    // Top-level Blockly serialized blocks
  ]
}`

  const userPrompt = `Transpile this Arduino C++ sketch for target board ${boardName} (${voltage} logic) into visual blocks:\n\n\`\`\`cpp\n${request.code}\n\`\`\``

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const body = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`Gemini API Transpiler returned status ${res.status}:`, errText)
      const offline = transpileOfflineSketch(request.code, request.boardId)
      offline.warnings = [
        `Cloud AI returned status ${res.status}. Used deterministic offline transpiler.`
      ]
      return offline
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    const parsed = JSON.parse(text)
    const blocks: Record<string, unknown>[] = Array.isArray(parsed.blocks) ? parsed.blocks : []

    // If blocks are empty, fallback to offline parser
    if (blocks.length === 0) {
      const offline = transpileOfflineSketch(request.code, request.boardId)
      offline.warnings = [
        'Transpiled via offline engine due to incomplete block structure from cloud model.'
      ]
      return offline
    }

    const rawCount = countRawSnippets(blocks)
    const detectedBaud =
      typeof parsed.detectedBaudRate === 'number'
        ? parsed.detectedBaudRate
        : extractBaudRate(request.code)
    const components =
      Array.isArray(parsed.mappedComponents) && parsed.mappedComponents.length > 0
        ? parsed.mappedComponents
        : extractHardwareComponentsFromCode(request.code)

    return {
      success: true,
      blocks,
      explanation:
        parsed.explanation ||
        `Transpiled ${blocks.length} blocks with ${components.length} mapped components.`,
      mappedComponents: components,
      unmappedSnippetsCount: rawCount,
      detectedBaudRate: detectedBaud,
      source: 'gemini'
    }
  } catch (err) {
    console.warn('AI Transpiler call failed, falling back to offline engine:', err)
    const offline = transpileOfflineSketch(request.code, request.boardId)
    offline.warnings = [
      `Cloud connection failed (${err instanceof Error ? err.message : String(err)}). Used deterministic offline transpiler.`
    ]
    return offline
  }
}
