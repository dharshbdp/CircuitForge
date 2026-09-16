# CircuitForge — Phased Project Roadmap & Version Architecture

> **CircuitForge**: A beginner-friendly, Scratch-inspired IoT development environment that turns visual blocks into real hardware through AI-assisted programming.

---

## 🧭 Architectural Overview

```text
┌────────────────────────────────────────────────────────┐
│                   Renderer (React + TS)                │
│  ┌──────────────────────┬───────────────────────────┐  │
│  │ Visual Block Canvas  │  Live Code & Telemetry    │  │
│  │ (Blockly Workspace)  │  (Serial Monitor & Graphs)│  │
│  └──────────────────────┴───────────────────────────┘  │
└───────────────────────────▲────────────────────────────┘
                            │ IPC (Context Isolation / Preload)
┌───────────────────────────▼────────────────────────────┐
│                  Main Process (Electron)               │
│  ┌──────────────────┬─────────────────┬─────────────┐  │
│  │ Serial Manager   │ Compiler / CLI  │ AI Copilot  │  │
│  │ (Node SerialPort)│ (Arduino-CLI)   │ (LLM Engine)│  │
│  └──────────────────┴─────────────────┴─────────────┘  │
└───────────────────────────▲────────────────────────────┘
                            │ USB / Virtual COM / Wireless
┌───────────────────────────▼────────────────────────────┐
│             Physical Hardware / Microcontroller         │
│         (Arduino Uno/Nano, ESP32, RP2040 Pico)         │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Version Milestones & Implementation Phases

### 🔹 v0.1 — Hardware Link & Serial Core (Current Focus)
*Goal: Establish rock-solid desktop foundations and two-way serial communication between PC and microcontroller.*

- [x] **Phase 0: Environment & Desktop Toolchain Stabilization**
  - [x] Stabilize Electron + React + TypeScript + Vite scaffolding on Windows.
  - [x] Resolve Electron binary extraction and path resolution.
  - [x] Approve npm 11 build scripts (`esbuild`, `electron-winstaller`).
  - [x] Establish repository hygiene (`.gitignore`, clean Git baseline).
- [ ] **Phase 1: IPC Serial Bridge & Port Discovery**
  - [ ] Implement Main-process IPC handler for serial port enumeration.
  - [ ] Expose type-safe IPC APIs through `preload/index.ts` via `contextBridge`.
  - [ ] Build UI Port Selector dropdown with dynamic auto-refresh.
- [ ] **Phase 2: Connection Management & Hardware Status**
  - [ ] Support baud rate selection (9600, 115200, etc.).
  - [ ] Implement Connect, Disconnect, and Auto-Reconnect logic.
  - [ ] Add visual connection status badge (Connected, Disconnected, Connecting, Error).
- [ ] **Phase 3: Live Serial Monitor**
  - [ ] Real-time incoming data stream with autoscroll toggle.
  - [ ] Timestamps, ASCII / Hex view modes, and line-feed parsing.
  - [ ] Clear buffer button, export log to text file, and basic command send input.

---

### 🔹 v0.2 — Visual Logic & Block Canvas
*Goal: Bring Scratch-like visual programming to microcontroller logic.*

- [ ] **Phase 4: Block Workspace Engine**
  - [ ] Integrate Google Blockly into the React renderer with custom theme.
  - [ ] Implement responsive canvas layout (split-view: Blocks on left, Code/Monitor on right).
- [ ] **Phase 5: IoT & Hardware Block Taxonomy**
  - [ ] Digital/Analog Pin I/O blocks (`digitalWrite`, `analogRead`, PWM).
  - [ ] Time & Delay blocks (`delay`, `millis`, non-blocking timers).
  - [ ] Common sensor blocks (Ultrasonic HC-SR04, DHT11/22 Temperature & Humidity, LDR).
  - [ ] Actuator blocks (Servo motor angle, Relay switch, NeoPixel RGB LEDs).
- [ ] **Phase 6: Dual-Pane Real-Time Code Generator**
  - [ ] Real-time transpilation from visual blocks to C++ (Arduino wiring) and MicroPython.
  - [ ] Syntax-highlighted code preview with copy and export features.
  - [ ] Board profile presets (Arduino Uno R3/R4, ESP32 DevKit, Raspberry Pi Pico).

---

### 🔹 v0.3 — AI Hardware Copilot
*Goal: Context-aware hardware intelligence assisting beginners with wiring, logic, and debugging.*

- [ ] **Phase 7: Context-Aware Code & Circuit Explainer**
  - [ ] One-click explanation of what the current block graph does in plain English.
  - [ ] Dynamic ASCII / SVG wiring guide generated based on active blocks and selected pins.
- [ ] **Phase 8: Natural Language to Block Synthesis**
  - [ ] Prompt-to-Blocks: *"Blink a blue LED when someone walks within 20cm"*.
  - [ ] Automated block placement and auto-configuration of necessary pins.
- [ ] **Phase 9: Hardware Conflict & Diagnostic Assistant**
  - [ ] Static validation: Detect pin collisions (e.g., two sensors assigned to Pin 2).
  - [ ] Voltage/Current warning heuristics (e.g., warning against driving a 5V motor directly from a 3.3V GPIO).

---

### 🔹 v0.4 — Compilation & One-Click Flashing
*Goal: Zero-friction flashing directly from the desktop application.*

- [ ] **Phase 10: Embedded Toolchain Integration**
  - [ ] Bundle or detect `arduino-cli` / PlatformIO headless runner.
  - [ ] Automatic board index installation and core management.
- [ ] **Phase 11: One-Click Compile & Upload Pipeline**
  - [ ] Main-process orchestration of compilation steps.
  - [ ] Progress bar for flashing status with automatic port reconnect.
  - [ ] Clear, user-friendly compile error translations for beginners.

---

### 🔹 v1.0 — Dashboard, Telemetry & Distribution
*Goal: Complete end-to-end IoT platform ready for classrooms, hobbyists, and makers.*

- [ ] **Phase 12: Real-Time Telemetry & Sensor Dashboards**
  - [ ] Graphical widgets: live line graphs, gauges, switches, and sliders.
  - [ ] Data logging to CSV / JSON.
- [ ] **Phase 13: Project Storage & Template Library**
  - [ ] Save/Load `.circuitforge` project bundles (blocks + board configuration + notes).
  - [ ] Built-in starter project library with step-by-step tutorials.
- [ ] **Phase 14: Production Packaging & Release Automation**
  - [ ] Signed Windows installer (`.exe` / NSIS), macOS (`.dmg`), and Linux (`.AppImage`).
  - [ ] Automated GitHub Actions CI/CD release pipeline.

---

## 🛠️ Tech Stack Matrix

| Subsystem | Technologies Used |
| :--- | :--- |
| **Desktop Shell** | Electron 39+, Node.js (LTS recommended) |
| **Frontend UI** | React 19, TypeScript, Vite |
| **Hardware Communication** | Node `serialport` (via Electron Main Process IPC) |
| **Visual Programming** | Google Blockly |
| **Code Generation** | Blockly Generators (C++ Arduino, MicroPython) |
| **Toolchain & Flashing** | `arduino-cli` (v0.4+) |
| **Styling & Components** | Modern Vanilla CSS / CSS Modules |
