# CircuitForge

> **A visual IoT development environment that translates visual logic blocks into compiled embedded hardware firmware through AI-assisted programming.**

---

## Overview

CircuitForge is a desktop application designed to make microcontroller and IoT development accessible, visual, and reliable. By bridging visual block programming with real-world embedded hardware and AI guidance, CircuitForge enables learners, hobbyists, and developers to build embedded systems without getting blocked by toolchain configuration or boilerplate syntax errors.

---

## Current Milestone: v0.4 (Live Telemetry Dashboard & Project Storage) — Completed!

Milestones **v0.1**, **v0.2**, **v0.3**, and **v0.4** have all been completed:

- [x] **v0.1: Hardware Link & Serial Core**:
  - Electron 39 + React 19 + TypeScript + Vite desktop app running on Windows.
  - Auto-detection and listing of connected COM ports (Arduino Uno/Nano, ESP32, Raspberry Pi Pico).
  - Robust serial connection manager (`9600` to `230400` baud) with connection lifecycle states.
  - Live auto-scrolling Serial Monitor console with line ending selectors and timestamping.
- [x] **v0.2: Visual Logic & Block Canvas**:
  - Google Blockly integration using the modern Zelos renderer with a monochromatic engineering theme.
  - Microcontroller block taxonomy: GPIO (Digital, Analog, PWM), Timing (`delay`, `millis`), Actuators (Servo, Relay), Displays (WS2812B NeoPixel), and Sensors (HC-SR04, DHT11/22, LDR, PIR, MQ-2).
  - Dual-pane real-time code generators producing compilable **Arduino C++** and **MicroPython**.
- [x] **v0.3: Embedded Compilation & One-Click Flashing**:
  - Headless `arduino-cli` embedded toolchain integration with core indexer (`arduino:avr`, `esp32:esp32`, `rp2040:rp2040`).
  - One-click compile and flash pipeline with temporary sketch cache and automatic port unlocking.
  - Human-friendly compiler error translator for cryptic `gcc` and `avrdude` messages.
- [x] **v0.4: Live Telemetry Dashboard & Project Storage**:
  - Multi-format serial telemetry parser (JSON, Key-Value, and CSV).
  - Real-time HTML5 Canvas oscilloscope with auto-scaling Y-axis, channel filter chips, and metric cards (Latest, Min, Avg, Max).
  - Native `.circuitforge` project file format with save, open, dirty state tracking, and keyboard shortcuts (`Ctrl+S`, `Ctrl+O`, `Ctrl+N`).
  - Built-in Starter Project Library with 5 one-click loadable templates (Blink & Fade, Obstacle Avoidance, Weather Station, RGB Mood Lamp, Gas & Smoke Detector).

- [x] **v0.5: Code-to-Blocks Bidirectional Sync**:
  - Interactive & editable code editor with line numbers gutter, scroll sync, and tab indentation.
  - Deterministic AST reverse transpiler converting Arduino C++ back into visual Blockly blocks.
  - Zero-loss `raw_cpp_code` fallback block preserving custom or unmapped C++ statements.
  - Setup boilerplate filtering for automatic actuator and serial initialization.
  - "Update Blocks from Code" action button, sync status badge (`In Sync` / `Modified`), and `Ctrl+Shift+B` shortcut.

The current active milestone is **v0.6 (AI Hardware Copilot and Assistant)**. For the full multi-phase plan, refer to [ROADMAP.md](./ROADMAP.md).

---

## Roadmap Overview

- **v0.1**: Hardware Link and Serial Core (Completed)
- **v0.2**: Visual Logic and Block Canvas (Completed)
- **v0.3**: Embedded Compilation and One-Click Flashing (Completed)
- **v0.4**: Live Telemetry Dashboard and Project Storage (Completed)
- **v0.5**: Code-to-Blocks Bidirectional Sync (Completed)
- **v0.6**: AI Hardware Copilot and Assistant (Current — Circuit reasoning, prompt-to-blocks, pin conflict diagnostics)
- **v0.7**: AI-Powered Code-to-Blocks Transpiler (LLM-assisted conversion of complex/arbitrary Arduino sketches)
- **v1.0**: Production Packaging and Polished Release (Cross-platform installers, auto-updater & final polish)

See [ROADMAP.md](./ROADMAP.md) for detailed tasks and architecture breakdown.

---

## Repository Structure

```text
CircuitForge/
├── app/                        # Electron desktop application
│   ├── src/
│   │   ├── main/               # Electron Main Process (OS, serial & hardware I/O)
│   │   ├── preload/            # Context isolation bridge (IPC safe APIs)
│   │   ├── renderer/           # React + TypeScript frontend UI
│   │   ├── core/               # Blockly definitions, generators & validators
│   │   ├── hardware/           # Board definitions & pin mappings
│   │   └── shared/             # Shared IPC types and contracts
│   ├── electron.vite.config.ts # Vite configuration for main/preload/renderer
│   ├── package.json            # Desktop app dependencies and scripts
│   └── tsconfig.json           # TypeScript configuration
├── ROADMAP.md                  # Project roadmap and architecture phases
├── README.md                   # Project overview and quickstart guide
└── LICENSE                     # MIT License
```

---

## Getting Started (Windows Development)

### Prerequisites
- **Node.js**: LTS version recommended (v24 or v22).
- **Windows PowerShell**

> **Note for Windows PowerShell Users**:
> If PowerShell script execution policy restricts running `npm.ps1`, invoke npm via `npm.cmd`.

### Running the App Locally

1. **Navigate to the app directory**:
   ```powershell
   cd Z:\CircuitForge\app
   ```

2. **Install dependencies**:
   ```powershell
   npm.cmd install
   ```

3. **Start the development server with live reload**:
   ```powershell
   npm.cmd run dev
   ```

4. **Build production bundles**:
   ```powershell
   npm.cmd run build
   ```

---

## License

This project is licensed under the [MIT License](./LICENSE).
