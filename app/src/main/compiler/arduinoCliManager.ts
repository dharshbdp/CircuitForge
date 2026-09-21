import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import type { ToolchainStatus } from '@shared/types'

let cachedExecutablePath: string | null = null

/**
 * Locate the `arduino-cli` binary across priority search paths.
 */
export async function findArduinoCli(): Promise<string | null> {
  if (cachedExecutablePath && existsSync(cachedExecutablePath)) {
    return cachedExecutablePath
  }

  const exeName = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli'

  const searchPaths: string[] = []

  // 1. Electron app userData/bin directory
  try {
    const userDataPath = app.getPath('userData')
    searchPaths.push(join(userDataPath, 'bin', exeName))
    searchPaths.push(join(userDataPath, 'tools', 'arduino-cli', exeName))
  } catch {
    // app might not be ready yet
  }

  // 2. Bundled application resources directory
  if (process.resourcesPath) {
    searchPaths.push(join(process.resourcesPath, 'bin', exeName))
  }

  // 3. Local workspace resources (development mode)
  searchPaths.push(join(process.cwd(), 'resources', 'bin', exeName))
  searchPaths.push(join(process.cwd(), 'bin', exeName))

  // 4. Common install locations on Windows
  if (process.platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA']
    if (localAppData) {
      searchPaths.push(join(localAppData, 'Arduino15', exeName))
      searchPaths.push(join(localAppData, 'Programs', 'arduino-cli', exeName))
    }
  }

  for (const candidate of searchPaths) {
    if (existsSync(candidate)) {
      cachedExecutablePath = candidate
      return candidate
    }
  }

  // 5. System PATH lookup
  const pathExe = await findInPath(exeName)
  if (pathExe) {
    cachedExecutablePath = pathExe
    return pathExe
  }

  return null
}

/**
 * Check PATH environment variable for executable.
 */
function findInPath(exeName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const proc = spawn(cmd, [exeName], { shell: true })
    let stdout = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const first = stdout.trim().split('\n')[0].trim()
        resolve(first)
      } else {
        resolve(null)
      }
    })

    proc.on('error', () => {
      resolve(null)
    })
  })
}

/**
 * Execute an arduino-cli command and return stdout/stderr.
 */
export async function executeArduinoCli(
  args: string[],
  onLog?: (data: string) => void
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const binaryPath = await findArduinoCli()

  if (!binaryPath) {
    throw new Error(
      'arduino-cli executable not found. Please install arduino-cli or place it in CircuitForge toolchain directory.'
    )
  }

  return new Promise((resolve) => {
    const proc = spawn(binaryPath, args, {
      shell: false,
      env: {
        ...process.env
      }
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      stdout += text
      onLog?.(text)
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      stderr += text
      onLog?.(text)
    })

    proc.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr
      })
    })

    proc.on('error', (err) => {
      stderr += err.message
      resolve({
        exitCode: 1,
        stdout,
        stderr
      })
    })
  })
}

/**
 * Query toolchain presence, version, and installed hardware cores.
 */
export async function getToolchainStatus(): Promise<ToolchainStatus> {
  const binaryPath = await findArduinoCli()

  if (!binaryPath) {
    return {
      isInstalled: false,
      installedCores: []
    }
  }

  let version: string | undefined
  const installedCores: string[] = []

  // Query version
  try {
    const verResult = await executeArduinoCli(['version', '--format', 'json'])
    if (verResult.exitCode === 0) {
      const parsed = JSON.parse(verResult.stdout)
      version = parsed.VersionString || parsed.version
    }
  } catch {
    // Fallback: raw version
    try {
      const rawVer = await executeArduinoCli(['version'])
      version = rawVer.stdout.trim().split('\n')[0]
    } catch {
      version = 'detected'
    }
  }

  // Query installed cores
  try {
    const coreResult = await executeArduinoCli(['core', 'list', '--format', 'json'])
    if (coreResult.exitCode === 0) {
      const parsed = JSON.parse(coreResult.stdout)
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          if (c.ID) installedCores.push(c.ID)
        }
      }
    }
  } catch (err) {
    console.warn('Failed to query installed cores:', err)
  }

  return {
    isInstalled: true,
    version,
    executablePath: binaryPath,
    installedCores
  }
}

/**
 * Initializes and installs a required board core into the local toolchain.
 */
export async function installCore(
  coreId: string,
  onLog?: (data: string) => void
): Promise<boolean> {
  try {
    // Update core index first
    onLog?.(`Updating board package index...\n`)
    await executeArduinoCli(['core', 'update-index'], onLog)

    // Install specified core
    onLog?.(`Installing core ${coreId}...\n`)
    const result = await executeArduinoCli(['core', 'install', coreId], onLog)
    return result.exitCode === 0
  } catch (err) {
    onLog?.(
      `Error installing core ${coreId}: ${err instanceof Error ? err.message : String(err)}\n`
    )
    return false
  }
}
