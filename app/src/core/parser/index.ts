import * as Blockly from 'blockly'
import { parseCppToBlocks, ParseResult } from './cppParser'

export interface CodeToBlocksOptions {
  clearWorkspace?: boolean
}

export interface CodeToBlocksResult {
  success: boolean
  blockCount: number
  errors?: string[]
  warnings?: string[]
}

/**
 * Converts C++ (or MicroPython) code into Blockly blocks and loads them onto the workspace.
 */
export function codeToBlocks(
  code: string,
  _language: 'cpp' | 'python',
  workspace: Blockly.WorkspaceSvg,
  options: CodeToBlocksOptions = { clearWorkspace: true }
): CodeToBlocksResult {
  if (!code.trim()) {
    if (options.clearWorkspace) {
      workspace.clear()
    }
    return { success: true, blockCount: 0 }
  }

  const result: ParseResult = parseCppToBlocks(code)

  if (!result.success || result.blocks.length === 0) {
    return {
      success: result.success,
      blockCount: 0,
      errors: result.errors || ['No valid blocks could be parsed from the provided code.'],
      warnings: result.warnings
    }
  }

  try {
    if (options.clearWorkspace) {
      workspace.clear()
    }

    const workspaceState = {
      blocks: {
        languageVersion: 0,
        blocks: result.blocks
      }
    }

    Blockly.serialization.workspaces.load(workspaceState, workspace)
    const count = workspace.getAllBlocks(false).length

    return {
      success: true,
      blockCount: count,
      warnings: result.warnings
    }
  } catch (err) {
    console.error('Failed to load parsed blocks into workspace:', err)
    return {
      success: false,
      blockCount: 0,
      errors: [err instanceof Error ? err.message : String(err)]
    }
  }
}

export * from './cppParser'
