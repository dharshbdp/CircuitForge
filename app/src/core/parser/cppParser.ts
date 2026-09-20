/**
 * CircuitForge C++ to Blockly AST Parser
 * Converts Arduino C++ source code into Blockly BlockState JSON.
 */

export interface ParsedBlock {
  type: string
  id?: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: ParsedBlock; shadow?: ParsedBlock }>
  extraState?: Record<string, unknown>
  next?: { block: ParsedBlock }
}

export interface ParseResult {
  success: boolean
  blocks: ParsedBlock[]
  warnings?: string[]
  errors?: string[]
}

// Helper to normalize pin representations ('9' -> '9', 'D9' -> '9', 'A0' -> 'A0')
function normalizePin(pinStr: string): string {
  const clean = pinStr.trim().replace(/^['"]|['"]$/g, '')
  // Strip ~PWM suffix if present
  const noPwm = clean.replace(/\s*\(~PWM\)/i, '')
  // Map D0-D13 to 0-13
  const dMatch = noPwm.match(/^D(\d+)$/i)
  if (dMatch) return dMatch[1]
  return noPwm
}

/**
 * Tokenize statements while respecting nested braces, parentheses, and quotes.
 */
function splitStatements(code: string): string[] {
  const statements: string[] = []
  let current = ''
  let braceDepth = 0
  let parenDepth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    const prevChar = i > 0 ? code[i - 1] : ''

    // Handle strings
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === '{') braceDepth++
      else if (char === '}') braceDepth--
      else if (char === '(') parenDepth++
      else if (char === ')') parenDepth--

      // Statement terminator
      if (braceDepth === 0 && parenDepth === 0) {
        if (char === ';') {
          current += char
          if (current.trim()) {
            statements.push(current.trim())
          }
          current = ''
          continue
        } else if (char === '}') {
          current += char
          // Check if followed by 'else'
          const remaining = code.slice(i + 1).trim()
          if (!remaining.startsWith('else')) {
            if (current.trim()) {
              statements.push(current.trim())
            }
            current = ''
          }
          continue
        }
      }
    }

    current += char
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

/**
 * Parse an expression into a block (or shadow block).
 */
export function parseExpression(expr: string): ParsedBlock {
  const trimmed = expr.trim()

  // 1. Number literal
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return {
      type: 'math_number',
      fields: { NUM: Number(trimmed) }
    }
  }

  // 2. String literal
  if (/^"(?:[^"\\]|\\.)*"$/.test(trimmed) || /^'(?:[^'\\]|\\.)*'$/.test(trimmed)) {
    const rawText = trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'")
    return {
      type: 'text',
      fields: { TEXT: rawText }
    }
  }

  // 3. Boolean literals
  if (/^(?:true|HIGH)$/i.test(trimmed)) {
    return {
      type: 'logic_boolean',
      fields: { BOOL: 'TRUE' }
    }
  }
  if (/^(?:false|LOW)$/i.test(trimmed)) {
    return {
      type: 'logic_boolean',
      fields: { BOOL: 'FALSE' }
    }
  }

  // 4. Ultrasonic sensor: readUltrasonicDistance(trig, echo)
  const usMatch = trimmed.match(/^readUltrasonicDistance\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/)
  if (usMatch) {
    return {
      type: 'sensor_ultrasonic',
      fields: {
        TRIG_PIN: normalizePin(usMatch[1]),
        ECHO_PIN: normalizePin(usMatch[2])
      }
    }
  }

  // 5. Digital Read: digitalRead(pin)
  const drMatch = trimmed.match(/^digitalRead\s*\(\s*([^)]+)\s*\)$/)
  if (drMatch) {
    return {
      type: 'pin_digital_read',
      fields: { PIN: normalizePin(drMatch[1]) }
    }
  }

  // 6. Analog Read: analogRead(pin)
  const arMatch = trimmed.match(/^analogRead\s*\(\s*([^)]+)\s*\)$/)
  if (arMatch) {
    const pin = normalizePin(arMatch[1])
    return {
      type: 'pin_analog_read',
      fields: { PIN: pin }
    }
  }

  // 7. DHT Sensor calls: dht.readTemperature(), dht.readHumidity()
  const dhtMatch = trimmed.match(/^dht\.(readTemperature|readHumidity)\s*\(\s*\)$/)
  if (dhtMatch) {
    return {
      type: 'sensor_dht',
      fields: {
        MODEL: 'DHT11',
        PIN: '2',
        METRIC: dhtMatch[1] === 'readTemperature' ? 'TEMP_C' : 'HUMIDITY'
      }
    }
  }

  // 8. Runtime millis: millis()
  if (/^millis\s*\(\s*\)$/.test(trimmed)) {
    return { type: 'time_millis' }
  }

  // 9. Comparison: a < b, a <= b, a > b, a >= b, a == b, a != b
  const cmpMatch = trimmed.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/)
  if (cmpMatch) {
    const opMap: Record<string, string> = {
      '==': 'EQ',
      '!=': 'NEQ',
      '<': 'LT',
      '<=': 'LTE',
      '>': 'GT',
      '>=': 'GTE'
    }
    const op = opMap[cmpMatch[2]]
    if (op) {
      return {
        type: 'logic_compare',
        fields: { OP: op },
        inputs: {
          A: { block: parseExpression(cmpMatch[1]) },
          B: { shadow: parseExpression(cmpMatch[3]) }
        }
      }
    }
  }

  // 10. Logical operations: a && b, a || b
  const logicMatch = trimmed.match(/^(.+?)\s*(&&|\|\|)\s*(.+)$/)
  if (logicMatch) {
    return {
      type: 'logic_operation',
      fields: { OP: logicMatch[2] === '&&' ? 'AND' : 'OR' },
      inputs: {
        A: { block: parseExpression(logicMatch[1]) },
        B: { block: parseExpression(logicMatch[3]) }
      }
    }
  }

  // 11. Arithmetic: a + b, a - b, a * b, a / b
  const arithMatch = trimmed.match(/^(.+?)\s*([+\-*/])\s*(.+)$/)
  if (arithMatch) {
    const opMap: Record<string, string> = {
      '+': 'ADD',
      '-': 'MINUS',
      '*': 'MULTIPLY',
      '/': 'DIVIDE'
    }
    const op = opMap[arithMatch[2]]
    if (op) {
      return {
        type: 'math_arithmetic',
        fields: { OP: op },
        inputs: {
          A: { block: parseExpression(arithMatch[1]) },
          B: { shadow: parseExpression(arithMatch[3]) }
        }
      }
    }
  }

  // 12. Variable getter (identifier)
  if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
    return {
      type: 'variables_get',
      fields: { VAR: trimmed }
    }
  }

  // Fallback: wrap unknown expression in text block
  return {
    type: 'text',
    fields: { TEXT: trimmed }
  }
}

/**
 * Parse a single statement into a block.
 */
function parseStatement(stmt: string): ParsedBlock | null {
  const trimmed = stmt.trim()
  if (!trimmed || trimmed === ';') return null

  // 1. Digital Write: digitalWrite(pin, HIGH/LOW/1/0)
  const dwMatch = trimmed.match(/^digitalWrite\s*\(\s*([^,]+)\s*,\s*(HIGH|LOW|1|0)\s*\);?$/i)
  if (dwMatch) {
    const rawVal = dwMatch[2].toUpperCase()
    const state = rawVal === '1' || rawVal === 'HIGH' ? 'HIGH' : 'LOW'
    return {
      type: 'pin_digital_write',
      fields: {
        PIN: normalizePin(dwMatch[1]),
        STATE: state
      }
    }
  }

  // 2. Analog Write (PWM): analogWrite(pin, val)
  const awMatch = trimmed.match(/^analogWrite\s*\(\s*([^,]+)\s*,\s*(.+?)\s*\);?$/)
  if (awMatch) {
    return {
      type: 'pin_analog_write',
      fields: { PIN: normalizePin(awMatch[1]) },
      inputs: {
        VALUE: { shadow: parseExpression(awMatch[2]) }
      }
    }
  }

  // 3. Pin Mode: pinMode(pin, OUTPUT/INPUT/INPUT_PULLUP)
  const pmMatch = trimmed.match(
    /^pinMode\s*\(\s*([^,]+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\);?$/i
  )
  if (pmMatch) {
    return {
      type: 'pin_set_mode',
      fields: {
        PIN: normalizePin(pmMatch[1]),
        MODE: pmMatch[2].toUpperCase()
      }
    }
  }

  // 4. Delay ms: delay(ms)
  const delayMatch = trimmed.match(/^delay\s*\(\s*(.+?)\s*\);?$/)
  if (delayMatch) {
    return {
      type: 'time_delay',
      inputs: {
        DELAY_MS: { shadow: parseExpression(delayMatch[1]) }
      }
    }
  }

  // 5. Delay us: delayMicroseconds(us)
  const delayUsMatch = trimmed.match(/^delayMicroseconds\s*\(\s*(.+?)\s*\);?$/)
  if (delayUsMatch) {
    return {
      type: 'time_delay_micros',
      inputs: {
        DELAY_US: { shadow: parseExpression(delayUsMatch[1]) }
      }
    }
  }

  // 6. Serial Print: Serial.println(val), Serial.print(val)
  const serialMatch = trimmed.match(/^Serial\.(println|print)\s*\(\s*(.*?)\s*\);?$/)
  if (serialMatch) {
    const isNewline = serialMatch[1] === 'println'
    const content = serialMatch[2].trim()
    return {
      type: 'serial_print',
      fields: { NEWLINE: isNewline },
      inputs: {
        CONTENT: { shadow: parseExpression(content || '""') }
      }
    }
  }

  // 7. Servo write: servo.write(angle) or servo_pin.write(angle)
  const servoMatch = trimmed.match(/^(?:servo_?(\w+)|servo)\.write\s*\(\s*(.+?)\s*\);?$/)
  if (servoMatch) {
    const pin = servoMatch[1] ? normalizePin(servoMatch[1]) : '9'
    return {
      type: 'actuator_servo',
      fields: { PIN: pin },
      inputs: {
        ANGLE: { shadow: parseExpression(servoMatch[2]) }
      }
    }
  }

  // 8. NeoPixel Clear: pixels.clear()
  if (/^(?:pixels|strip)\.clear\s*\(\s*\);?$/.test(trimmed)) {
    return {
      type: 'neopixel_clear',
      fields: { PIN: '6' }
    }
  }

  // 9. NeoPixel Set Color: pixels.setPixelColor(i, pixels.Color(r, g, b))
  const neoMatch = trimmed.match(
    /^(?:pixels|strip)\.setPixelColor\s*\(\s*([^,]+)\s*,\s*(?:pixels|strip)\.Color\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*\);?$/
  )
  if (neoMatch) {
    return {
      type: 'neopixel_set_color',
      fields: { PIN: '6' },
      inputs: {
        PIXEL: { shadow: parseExpression(neoMatch[1]) },
        RED: { shadow: parseExpression(neoMatch[2]) },
        GREEN: { shadow: parseExpression(neoMatch[3]) },
        BLUE: { shadow: parseExpression(neoMatch[4]) }
      }
    }
  }

  // 10. If / Else If / Else
  const ifMatch = trimmed.match(
    /^if\s*\(([\s\S]*?)\)\s*\{([\s\S]*?)\}(?:\s*else\s*\{([\s\S]*?)\})?$/
  )
  if (ifMatch) {
    const condition = ifMatch[1]
    const doBody = ifMatch[2]
    const elseBody = ifMatch[3]

    const doBlocks = parseStatementList(doBody)
    const block: ParsedBlock = {
      type: 'controls_if',
      inputs: {
        IF0: { block: parseExpression(condition) }
      }
    }

    if (doBlocks.length > 0) {
      block.inputs!.DO0 = { block: chainBlocks(doBlocks)! }
    }

    if (elseBody !== undefined) {
      block.extraState = { hasElse: true }
      const elseBlocks = parseStatementList(elseBody)
      if (elseBlocks.length > 0) {
        block.inputs!.ELSE = { block: chainBlocks(elseBlocks)! }
      }
    }

    return block
  }

  // 11. While loop: while (condition) { ... }
  const whileMatch = trimmed.match(/^while\s*\(([\s\S]*?)\)\s*\{([\s\S]*?)\}$/)
  if (whileMatch) {
    const cond = whileMatch[1]
    const body = whileMatch[2]
    const bodyBlocks = parseStatementList(body)
    const block: ParsedBlock = {
      type: 'controls_whileUntil',
      fields: { MODE: 'WHILE' },
      inputs: {
        BOOL: { block: parseExpression(cond) }
      }
    }
    if (bodyBlocks.length > 0) {
      block.inputs!.DO = { block: chainBlocks(bodyBlocks)! }
    }
    return block
  }

  // 12. For loop: for (int i = from; i <= to; i += by) { ... }
  const forMatch = trimmed.match(
    /^for\s*\(\s*(?:int|long)?\s*(\w+)\s*=\s*([^;]+);\s*\1\s*(?:<=|<)\s*([^;]+);\s*\1\s*(?:\+\+|\+=\s*([^)]+))\s*\)\s*\{([\s\S]*?)\}$/
  )
  if (forMatch) {
    const varName = forMatch[1]
    const from = forMatch[2]
    const to = forMatch[3]
    const by = forMatch[4] || '1'
    const body = forMatch[5]
    const bodyBlocks = parseStatementList(body)

    const block: ParsedBlock = {
      type: 'controls_for',
      fields: { VAR: varName },
      inputs: {
        FROM: { shadow: parseExpression(from) },
        TO: { shadow: parseExpression(to) },
        BY: { shadow: parseExpression(by) }
      }
    }
    if (bodyBlocks.length > 0) {
      block.inputs!.DO = { block: chainBlocks(bodyBlocks)! }
    }
    return block
  }

  // 13. Variable assignment: int x = 10; or x = 20;
  const varMatch = trimmed.match(
    /^(?:(?:const\s+)?(?:int|long|float|double|bool|auto)\s+)?([a-zA-Z_]\w*)\s*=\s*(.+?);?$/
  )
  if (varMatch && !trimmed.startsWith('Serial.') && !trimmed.startsWith('pinMode')) {
    const varName = varMatch[1]
    const valueExpr = varMatch[2]
    return {
      type: 'variables_set',
      fields: { VAR: varName },
      inputs: {
        VALUE: { shadow: parseExpression(valueExpr) }
      }
    }
  }

  // Fallback: raw C++ code block
  return {
    type: 'raw_cpp_code',
    fields: { CODE: trimmed.replace(/;$/, '') + ';' }
  }
}

/**
 * Parse a block of code into a list of parsed statement blocks.
 */
function parseStatementList(code: string): ParsedBlock[] {
  const statements = splitStatements(code)
  const blocks: ParsedBlock[] = []

  for (const stmt of statements) {
    const parsed = parseStatement(stmt)
    if (parsed) {
      blocks.push(parsed)
    }
  }

  return blocks
}

/**
 * Chain a list of blocks together using the `next` connection.
 */
export function chainBlocks(blocks: ParsedBlock[]): ParsedBlock | null {
  if (blocks.length === 0) return null
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].next = { block: blocks[i + 1] }
  }
  return blocks[0]
}

/**
 * Extract body of a function (e.g. void setup(), void loop()) respecting nested braces.
 */
function extractFunctionBody(code: string, fnName: string): string | null {
  const pattern = new RegExp(`(?:void|int|long)\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{`)
  const match = code.match(pattern)
  if (!match || match.index === undefined) return null

  const startIndex = match.index + match[0].length
  let depth = 1
  let inString = false
  let stringChar = ''

  for (let i = startIndex; i < code.length; i++) {
    const char = code[i]
    const prev = i > 0 ? code[i - 1] : ''

    if ((char === '"' || char === "'") && prev !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
        if (depth === 0) {
          return code.slice(startIndex, i)
        }
      }
    }
  }

  return null
}

/**
 * Main parser entry point: parses full Arduino C++ sketch into a top-level block tree.
 */
export function parseCppToBlocks(cppCode: string): ParseResult {
  // Strip comments
  const cleanCode = cppCode
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/\/\/[^\n]*/g, '') // remove single-line comments

  // Locate setup() and loop() bodies respecting nested braces
  const setupBody = extractFunctionBody(cleanCode, 'setup')
  const loopBody = extractFunctionBody(cleanCode, 'loop')

  const allBlocks: ParsedBlock[] = []

  if (setupBody !== null || loopBody !== null) {
    // 1. Process setup() statements (excluding auto-generated hardware attach/begin boilerplate)
    if (setupBody !== null) {
      const setupBlocks = parseStatementList(setupBody).filter((b) => {
        if (b.type === 'raw_cpp_code') {
          const code = (b.fields?.CODE as string) || ''
          if (
            /\w+\.attach\([^)]*\);?/.test(code) ||
            /\w+\.begin\([^)]*\);?/.test(code) ||
            /Serial\.begin\([^)]*\);?/.test(code)
          ) {
            return false
          }
        }
        return true
      })
      allBlocks.push(...setupBlocks)
    }

    // 2. Process loop() statements
    if (loopBody !== null) {
      const loopBlocks = parseStatementList(loopBody)
      allBlocks.push(...loopBlocks)
    }
  } else {
    // If no setup/loop, parse entire code as sequential statements
    const blocks = parseStatementList(cleanCode)
    allBlocks.push(...blocks)
  }

  if (allBlocks.length === 0) {
    return {
      success: true,
      blocks: [],
      warnings: ['No recognizable statements found in code.']
    }
  }

  // Position the root block nicely on canvas
  const root = chainBlocks(allBlocks)
  if (root) {
    const rootWithPos = {
      ...root,
      x: 60,
      y: 60
    }
    return {
      success: true,
      blocks: [rootWithPos]
    }
  }

  return {
    success: false,
    blocks: [],
    errors: ['Failed to construct block hierarchy.']
  }
}
