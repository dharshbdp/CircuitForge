/**
 * CircuitForge Offline Intent Synthesizer
 * Deterministic natural language compiler translating common IoT and microcontroller
 * requirements into valid, connected Blockly blocks and idiomatic Arduino C++.
 */

import { parseCppToBlocks, ParsedBlock } from '../parser/cppParser'
import { getBoardById } from '../../hardware'

export interface OfflineSynthesisResult {
  explanation: string
  cppCode: string
  blocks: ParsedBlock[]
}

/**
 * Extracts pin references from natural language prompt.
 * Examples: "pin 13", "pin D9", "pin A0", "pin 8"
 */
function extractPins(text: string): { digitals: string[]; analogs: string[] } {
  const digitals: string[] = []
  const analogs: string[] = []

  // Match explicit "pin 13", "pin 8", "pin D9", "D9"
  const explicitMatches = text.matchAll(/\b(?:pin|digital pin|d)\s*(1[0-3]|[0-9])\b/gi)
  for (const m of explicitMatches) {
    if (!digitals.includes(m[1])) {
      digitals.push(m[1])
    }
  }

  // Match explicit analog pins "A0" - "A5" or "pin A0"
  const aMatches = text.matchAll(/\b(?:pin\s*)?A([0-5])\b/gi)
  for (const m of aMatches) {
    const pin = `A${m[1]}`
    if (!analogs.includes(pin)) {
      analogs.push(pin)
    }
  }

  // If no digital pins were explicitly marked with "pin" or "D", match numbers not followed by units
  if (digitals.length === 0) {
    const standaloneMatches = text.matchAll(
      /\b(1[0-3]|[0-9])\b(?!\s*(?:cm|deg|degrees|ms|millis|milliseconds|s|sec|second|seconds|leds|pixels|%))/gi
    )
    for (const m of standaloneMatches) {
      if (!digitals.includes(m[1])) {
        digitals.push(m[1])
      }
    }
  }

  return { digitals, analogs }
}

/**
 * Extracts delay milliseconds from prompt.
 * Examples: "500ms", "1 second", "2 sec", "100 ms"
 */
function extractDelayMs(text: string, defaultMs: number = 1000): number {
  const msMatch = text.match(/(\d+)\s*(?:ms|millis|milliseconds)/i)
  if (msMatch) return parseInt(msMatch[1], 10)

  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)/i)
  if (secMatch) return Math.round(parseFloat(secMatch[1]) * 1000)

  return defaultMs
}

/**
 * Extracts numeric threshold or count.
 * Examples: "closer than 10cm", "below 300", "exceeds 400"
 */
function extractThreshold(text: string, defaultVal: number = 10): number {
  const keywordMatch = text.match(
    /(?:closer than|less than|below|<|exceeds|greater than|>|drops below|more than)\s*(\d+)/i
  )
  if (keywordMatch && keywordMatch[1]) {
    return parseInt(keywordMatch[1], 10)
  }

  const unitMatch = text.match(/(\d+)\s*(?:cm|deg|degrees|leds|pixels)/i)
  if (unitMatch && unitMatch[1]) {
    return parseInt(unitMatch[1], 10)
  }

  return defaultVal
}

/**
 * Deterministically synthesizes C++ and Blockly blocks from natural language prompts.
 */
export function synthesizeOfflineIntent(
  prompt: string,
  boardId: string = 'arduino:avr:uno'
): OfflineSynthesisResult {
  const lower = prompt.toLowerCase()
  const { digitals, analogs } = extractPins(prompt)
  const board = getBoardById(boardId)
  const boardName = board?.name || 'Microcontroller'

  // 1. Ultrasonic Obstacle Detection / Proximity Alert
  if (
    lower.includes('ultrasonic') ||
    lower.includes('hc-sr04') ||
    (lower.includes('distance') && (lower.includes('closer') || lower.includes('cm')))
  ) {
    const trigMatch = prompt.match(/trig(?:ger)?\s*(?:pin)?\s*(1[0-3]|[0-9])/i)
    const echoMatch = prompt.match(/echo\s*(?:pin)?\s*(1[0-3]|[0-9])/i)
    const buzzerMatch = prompt.match(/buzzer\s*(?:on\s*)?(?:pin)?\s*(1[0-3]|[0-9])/i)
    const ledMatch = prompt.match(/led\s*(?:on\s*)?(?:pin)?\s*(1[0-3]|[0-9])/i)

    const trig = trigMatch ? trigMatch[1] : '9'
    const echo = echoMatch ? echoMatch[1] : '10'
    const buzzer = buzzerMatch
      ? buzzerMatch[1]
      : digitals.find((p) => p !== trig && p !== echo) || '8'
    const led = ledMatch
      ? ledMatch[1]
      : digitals.find((p) => p !== trig && p !== echo && p !== buzzer) || '13'
    const threshold = extractThreshold(prompt, 10)

    const cpp = `
#define TRIG_PIN ${trig}
#define ECHO_PIN ${echo}
#define BUZZER_PIN ${buzzer}
#define LED_PIN ${led}

long readDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 400;
  return duration * 0.034 / 2;
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("HC-SR04 Ultrasonic System Active");
}

void loop() {
  long distance = readDistanceCM();
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  if (distance < ${threshold}) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
  }
  delay(100);
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Configured HC-SR04 ultrasonic distance sensor for ${boardName} on Trig Pin ${trig} and Echo Pin ${echo}. When measured distance drops below ${threshold} cm, triggers buzzer on Pin ${buzzer} and flashes alert LED on Pin ${led}.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 2. Motion Detection (PIR Sensor)
  if (lower.includes('pir') || lower.includes('motion')) {
    const pirPin = digitals[0] || '4'
    const outputPin = digitals[1] || (lower.includes('relay') ? '7' : '13')
    const isRelay = lower.includes('relay')
    const targetName = isRelay ? 'relay switch' : 'alert LED'

    const cpp = `
#define PIR_PIN ${pirPin}
#define OUTPUT_PIN ${outputPin}

void setup() {
  pinMode(PIR_PIN, INPUT);
  pinMode(OUTPUT_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("PIR Motion Monitor Initialized");
}

void loop() {
  int motion = digitalRead(PIR_PIN);
  if (motion == HIGH) {
    Serial.println("Motion Detected!");
    digitalWrite(OUTPUT_PIN, HIGH);
    delay(3000);
  } else {
    digitalWrite(OUTPUT_PIN, LOW);
  }
  delay(200);
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Monitors digital PIR motion sensor on Pin ${pirPin} for ${boardName}. Upon detecting infrared movement, drives ${targetName} on Pin ${outputPin} HIGH for 3 seconds before resetting.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 3. Ambient Light Sensor (LDR Photoresistor) / Automatic Night Light
  if (lower.includes('ldr') || lower.includes('light sensor') || lower.includes('night light')) {
    const ldrPin = analogs[0] || 'A0'
    const ledPin = digitals[0] || '9'
    const threshold = extractThreshold(prompt, 300)

    const cpp = `
#define LDR_PIN ${ldrPin}
#define LED_PIN ${ledPin}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("Automatic LDR Night Light System");
}

void loop() {
  int lightLevel = analogRead(LDR_PIN);
  Serial.print("Ambient Light: ");
  Serial.println(lightLevel);
  if (lightLevel < ${threshold}) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
  delay(500);
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Reads analog ambient light levels from photoresistor on ${ldrPin} for ${boardName}. When light drops below threshold ${threshold} (darkness detected), activates LED on Pin ${ledPin}.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 4. Temperature & Humidity (DHT11 / DHT22)
  if (lower.includes('dht') || lower.includes('temperature') || lower.includes('humidity')) {
    const dhtPin = digitals[0] || '2'
    const model = lower.includes('22') ? 'DHT22' : 'DHT11'
    const delayMs = extractDelayMs(prompt, 2000)

    const cpp = `
#include <DHT.h>
#define DHT_PIN ${dhtPin}
#define DHT_TYPE ${model}

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println("${model} Weather Station Active");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" C, Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
  delay(${delayMs});
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Initializes ${model} sensor on Pin ${dhtPin} for ${boardName}. Continuously samples ambient temperature and relative humidity every ${delayMs}ms and streams structured readings to Serial Monitor.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 5. Gas & Smoke Detection (MQ-2 Sensor)
  if (
    lower.includes('mq2') ||
    lower.includes('mq-2') ||
    lower.includes('gas') ||
    lower.includes('smoke')
  ) {
    const mq2Pin = analogs[0] || 'A0'
    const buzzerPin = digitals[0] || '8'
    const threshold = extractThreshold(prompt, 400)

    const cpp = `
#define MQ2_PIN ${mq2Pin}
#define ALARM_PIN ${buzzerPin}

void setup() {
  pinMode(ALARM_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("MQ-2 Gas & Smoke Detector Initialized");
}

void loop() {
  int gasLevel = analogRead(MQ2_PIN);
  Serial.print("Gas Concentration: ");
  Serial.println(gasLevel);
  if (gasLevel > ${threshold}) {
    digitalWrite(ALARM_PIN, HIGH);
    delay(200);
    digitalWrite(ALARM_PIN, LOW);
    delay(200);
  } else {
    digitalWrite(ALARM_PIN, LOW);
  }
  delay(300);
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Samples analog combustible gas and smoke levels on ${mq2Pin} for ${boardName}. If reading exceeds ${threshold} ADC units, sounds pulsing alarm on Pin ${buzzerPin}.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 6. Servo Motor Sweep & Positioning
  if (lower.includes('servo') || lower.includes('sweep') || lower.includes('angle')) {
    const servoPin = digitals[0] || '9'
    const delayMs = extractDelayMs(prompt, 1000)

    const cpp = `
#include <Servo.h>
#define SERVO_PIN ${servoPin}

Servo myServo;

void setup() {
  myServo.attach(SERVO_PIN);
  Serial.begin(115200);
  Serial.println("Servo Motor Controller Initialized");
}

void loop() {
  myServo.write(0);
  Serial.println("Servo Angle: 0 deg");
  delay(${delayMs});
  myServo.write(90);
  Serial.println("Servo Angle: 90 deg");
  delay(${delayMs});
  myServo.write(180);
  Serial.println("Servo Angle: 180 deg");
  delay(${delayMs});
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Attaches standard 5V hobby servo motor to PWM Pin ${servoPin} on ${boardName}. Steps shaft through 0°, 90°, and 180° positions with ${delayMs}ms dwell time at each angle.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 7. NeoPixel WS2812B Addressable RGB LED
  if (
    lower.includes('neopixel') ||
    lower.includes('ws2812') ||
    lower.includes('rainbow') ||
    lower.includes('rgb led')
  ) {
    const neoPin = digitals[0] || '6'
    const count = extractThreshold(prompt, 8)

    const cpp = `
#include <Adafruit_NeoPixel.h>
#define LED_PIN ${neoPin}
#define NUM_LEDS ${count}

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  strip.begin();
  strip.show();
  Serial.begin(115200);
  Serial.println("NeoPixel Strip Active");
}

void loop() {
  // Red
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(255, 0, 0));
  }
  strip.show();
  delay(1000);

  // Green
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(0, 255, 0));
  }
  strip.show();
  delay(1000);

  // Blue
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(0, 0, 255));
  }
  strip.show();
  delay(1000);
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Drives a chain of ${count} WS2812B addressable NeoPixels on Pin ${neoPin} for ${boardName}, cycling through saturated primary colors (Red, Green, Blue) at 1-second intervals.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 8. PWM Fade / Brightness
  if (lower.includes('fade') || lower.includes('pwm') || lower.includes('brightness')) {
    const pwmPin = digitals[0] || '9'

    const cpp = `
#define PWM_PIN ${pwmPin}

void setup() {
  pinMode(PWM_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("PWM Brightness Controller Active");
}

void loop() {
  for (int b = 0; b <= 255; b += 5) {
    analogWrite(PWM_PIN, b);
    delay(30);
  }
  for (int b = 255; b >= 0; b -= 5) {
    analogWrite(PWM_PIN, b);
    delay(30);
  }
}
`.trim()

    const parseRes = parseCppToBlocks(cpp)
    return {
      explanation: `Generates smooth PWM duty-cycle oscillation (0 to 255) on Pin ${pwmPin} for ${boardName} to fade an LED or control motor speed continuously.`,
      cppCode: cpp,
      blocks: parseRes.blocks
    }
  }

  // 9. Standard Digital LED Blink (Default & Fallback)
  const pin = digitals[0] || '13'
  const delayMs = extractDelayMs(prompt, 500)

  const cpp = `
#define LED_PIN ${pin}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("Digital Output Ready");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(${delayMs});
  digitalWrite(LED_PIN, LOW);
  delay(${delayMs});
}
`.trim()

  const parseRes = parseCppToBlocks(cpp)
  return {
    explanation: `Configures Pin ${pin} on ${boardName} as digital OUTPUT, repeatedly pulsing HIGH and LOW with ${delayMs}ms delay between states.`,
    cppCode: cpp,
    blocks: parseRes.blocks
  }
}
