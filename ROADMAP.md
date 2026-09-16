# CircuitForge — Project Roadmap and Architecture

> **CircuitForge**: A beginner-friendly, visual IoT development environment that translates visual logic blocks into compiled embedded hardware firmware through AI-assisted programming.

---

## Architecture Overview

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

## Version Milestones and Implementation Phases

### v0.1 — Hardware Link and Serial Core (Current Milestone)
*Objective: Establish the desktop foundation and two-way serial communication between the host PC and microcontrollers.*

- [x] **Phase 0: Environment and Desktop Toolchain Stabilization**
  - [x] Stabilize Electron + React + TypeScript + Vite scaffolding on Windows.
  - [x] Resolve Electron binary extraction and path resolution.
  - [x] Approve npm 11 build scripts (`esbuild`, `electron-winstaller`).
  - [x] Establish repository hygiene (`.gitignore`, clean Git baseline).
- [ ] **Phase 1: IPC Serial Bridge and Port Discovery**
  - [ ] Implement Main-process IPC handler for serial port enumeration.
  - [ ] Expose type-safe IPC APIs through `preload/index.ts` via `contextBridge`.
  - [ ] Build UI Port Selector dropdown with dynamic auto-refresh.
- [ ] **Phase 2: Connection Management and Hardware Status**
  - [ ] Support standard baud rate selection (9600, 19200, 57600, 115200).
  - [ ] Implement Connect, Disconnect, and Auto-Reconnect lifecycles.
  - [ ] Add visual connection status indicator (Connected, Disconnected, Connecting, Error).
- [ ] **Phase 3: Live Serial Monitor**
  - [ ] Real-time incoming data stream with autoscroll toggle.
  - [ ] Timestamps, ASCII / Hex display modes, and line-ending parsing (CR/LF).
  - [ ] Clear buffer option, export log to text file, and transmit input console.

---

### v0.2 — Visual Logic and Block Canvas
*Objective: Deliver Scratch-style visual programming tailored for microcontroller pinouts and hardware primitives.*

- [ ] **Phase 4: Block Workspace Engine**
  - [ ] Integrate Google Blockly into the React renderer with custom hardware theme.
  - [ ] Implement responsive layout (split-view: Blocks on left, Code/Monitor on right).
- [ ] **Phase 5: IoT and Hardware Block Taxonomy**
  - [ ] Digital and Analog Pin I/O blocks (`digitalWrite`, `digitalRead`, `analogRead`, PWM).
  - [ ] Time and Delay blocks (`delay`, `millis`, non-blocking timers).
  - [ ] Sensor blocks (Ultrasonic HC-SR04, DHT11/DHT22 Temperature & Humidity, LDR).
  - [ ] Actuator blocks (Servo angle control, Relay switches, NeoPixel RGB LEDs).
- [ ] **Phase 6: Dual-Pane Real-Time Code Generator**
  - [ ] Real-time transpilation from visual blocks to C++ (Arduino wiring) and MicroPython.
  - [ ] Syntax-highlighted code preview with copy and export features.
  - [ ] Board profile presets (Arduino Uno R3/R4, ESP32 DevKit, Raspberry Pi Pico).

---

### v0.3 — AI Hardware Copilot
*Objective: Provide context-aware hardware assistance for circuit wiring, logic design, and troubleshooting.*

- [ ] **Phase 7: Context-Aware Code and Circuit Explainer**
  - [ ] Plain-English explanations of the active block graph and runtime flow.
  - [ ] Dynamic wiring guides generated based on active blocks and assigned pins.
- [ ] **Phase 8: Natural Language to Block Synthesis**
  - [ ] Prompt-to-Blocks: Generate functional visual block arrangements from plain-text prompts.
  - [ ] Automated block placement and auto-configuration of required pin assignments.
- [ ] **Phase 9: Hardware Conflict and Diagnostic Assistant**
  - [ ] Static validation: Detect pin collisions and conflicting hardware modes.
  - [ ] Voltage and current rating warnings (e.g. 5V sensor to 3.3V GPIO protection warnings).

---

### v0.4 — Compilation and One-Click Flashing
*Objective: Provide headless local compilation and firmware flashing directly from the desktop application.*

- [ ] **Phase 10: Embedded Toolchain Integration**
  - [ ] Integrate headless `arduino-cli` orchestration within the Electron main process.
  - [ ] Automated board package and core indexing.
- [ ] **Phase 11: One-Click Compile and Upload Pipeline**
  - [ ] Orchestrate compile, sketch export, and flash pipelines.
  - [ ] Visual progress tracking for flashing status with automatic port re-acquisition.
  - [ ] Translated compiler diagnostics formatted for beginners.

---

### v1.0 — Dashboard, Telemetry, and Distribution
*Objective: Deliver a complete end-to-end IoT platform ready for classrooms, labs, and hobbyists.*

- [ ] **Phase 12: Real-Time Telemetry and Sensor Dashboards**
  - [ ] Live visualization widgets: line charts, gauges, state toggles, and sliders.
  - [ ] Telemetry data logging to CSV and JSON formats.
- [ ] **Phase 13: Project Storage and Template Library**
  - [ ] Save and load `.circuitforge` project archives (blocks, board configuration, and metadata).
  - [ ] Built-in starter project templates with step-by-step tutorials.
- [ ] **Phase 14: Production Packaging and Release Automation**
  - [ ] Automated packaging for Windows (NSIS installer), macOS, and Linux.
  - [ ] GitHub Actions CI/CD release workflow.

---

## Technology Stack Matrix

| Subsystem | Technologies Used |
| :--- | :--- |
| **Desktop Shell** | Electron 39+, Node.js (LTS recommended) |
| **Frontend UI** | React 19, TypeScript, Vite |
| **Hardware Communication** | Node `serialport` (via Electron Main Process IPC) |
| **Visual Programming** | Google Blockly |
| **Code Generation** | Blockly Generators (C++ Arduino, MicroPython) |
| **Toolchain & Flashing** | `arduino-cli` (v0.4+) |
| **Styling & Components** | Modern Vanilla CSS / CSS Modules |
