# CircuitForge

> **A visual IoT development environment that translates visual logic blocks into compiled embedded hardware firmware through AI-assisted programming.**

---

## Overview

CircuitForge is a desktop application designed to make microcontroller and IoT development accessible, visual, and reliable. By bridging visual block programming with real-world embedded hardware and AI guidance, CircuitForge enables learners, hobbyists, and developers to build embedded systems without getting blocked by toolchain configuration or boilerplate syntax errors.

---

## Current Milestone: v0.1 (Hardware Link and Serial Core)

The v0.1 milestone establishes the foundational desktop architecture and direct serial communication between the host PC and microcontrollers:

- [x] **Desktop Shell**: Electron + React + TypeScript + Vite running locally on Windows.
- [ ] **Serial Port Discovery**: Auto-detection and listing of connected COM ports (Arduino, ESP32, etc.).
- [ ] **Connection Manager**: Connect/disconnect lifecycle, baud rate selection, and status indicators.
- [ ] **Live Serial Monitor**: Real-time incoming data display, autoscroll, and transmit console.

For the full multi-phase project plan, refer to [ROADMAP.md](./ROADMAP.md).

---

## Repository Structure

```text
CircuitForge/
├── app/                        # Electron desktop application
│   ├── src/
│   │   ├── main/               # Electron Main Process (OS and hardware I/O)
│   │   ├── preload/            # Context isolation bridge (IPC safe APIs)
│   │   └── renderer/           # React + TypeScript frontend UI
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

## Roadmap Overview

- **v0.1**: Hardware Link and Serial Core (Current)
- **v0.2**: Visual Logic and Block Canvas (Blockly integration)
- **v0.3**: AI Hardware Copilot (Circuit reasoning and block synthesis)
- **v0.4**: Compilation and One-Click Flashing (Embedded CLI toolchain)
- **v1.0**: Live Telemetry Dashboard and Cross-Platform Distribution

See [ROADMAP.md](./ROADMAP.md) for detailed tasks and architecture breakdown.

---

## License

This project is licensed under the [MIT License](./LICENSE).
