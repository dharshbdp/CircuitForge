import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface PreparedSketch {
  sketchDir: string
  sketchPath: string
  cleanup: () => Promise<void>
}

/**
 * Creates an Arduino-CLI compliant sketch directory in system temp.
 * Arduino CLI requires the .ino filename to match its parent directory name.
 */
export async function prepareSketch(
  code: string,
  sketchName = 'circuitforge_sketch'
): Promise<PreparedSketch> {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const baseDir = join(tmpdir(), 'circuitforge_builds', `${timestamp}_${randomSuffix}`)
  const sketchDir = join(baseDir, sketchName)
  const sketchPath = join(sketchDir, `${sketchName}.ino`)

  await fs.mkdir(sketchDir, { recursive: true })
  await fs.writeFile(sketchPath, code, 'utf-8')

  const cleanup = async (): Promise<void> => {
    try {
      await fs.rm(baseDir, { recursive: true, force: true })
    } catch (err) {
      console.warn(`Failed to cleanup temp sketch dir ${baseDir}:`, err)
    }
  }

  return {
    sketchDir,
    sketchPath,
    cleanup
  }
}
