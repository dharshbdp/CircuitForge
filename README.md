# ⚡ CircuitForge

> **A Scratch-inspired IoT development environment that turns visual blocks into real hardware through AI-assisted programming.**

---

## 🎯 What is CircuitForge?

**CircuitForge** is a modern desktop application designed to make microcontroller and IoT development accessible, visual, and intelligent. By bridging visual block programming (like Scratch/Blockly) with real-world electronics and AI guidance, CircuitForge enables learners, hobbyists, and educators to create embedded systems without getting stuck on boilerplate syntax or arcane toolchain errors.

---

## 🚀 Current Milestone: v0.1 (Hardware Link & Serial Core)

The v0.1 milestone establishes the foundational desktop architecture and direct serial communication between your PC and hardware:

- [x] **Desktop Shell**: Electron + React + TypeScript + Vite running locally on Windows.
- [ ] **Serial Port Discovery**: Auto-detection and listing of connected COM ports (Arduino, ESP32, etc.).
- [ ] **Connection Manager**: Connect/disconnect lifecycle, baud rate selection, and status badges.
- [ ] **Live Serial Monitor**: Real-time incoming data display, autoscroll, and transmit console.

For the full multi-phase project plan, check out [ROADMAP.md](./ROADMAP.md).

---

## 📁 Repository Structure

```text
CircuitForge/
├── app/                        # Electron desktop application
│   ├── src/
│   │   ├── main/               # Electron Main Process (OS & hardware I/O)
│   │   ├── preload/            # Context isolation bridge (IPC safe APIs)
│   │   └── renderer/           # React + TypeScript frontend UI
│   ├── electron.vite.config.ts # Vite configuration for main/preload/renderer
│   ├── package.json            # Desktop app dependencies and scripts
│   └── tsconfig.json           # TypeScript configuration
├── ROADMAP.md                  # Detailed version milestones & phased architecture
├── README.md                   # Project overview & quickstart guide
└── LICENSE                     # MIT License
```

---

## 💻 Getting Started (Windows Development)

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

## 🛣️ Roadmap At a Glance

- **v0.1**: Hardware Link & Serial Core (Current)
- **v0.2**: Visual Logic & Block Canvas (Blockly integration)
- **v0.3**: AI Hardware Copilot (Circuit reasoning & block synthesis)
- **v0.4**: Compilation & One-Click Flashing (Embedded CLI toolchain)
- **v1.0**: Live Telemetry Dashboard & Cross-Platform Distribution

See [ROADMAP.md](./ROADMAP.md) for detailed tasks and architecture breakdown.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
