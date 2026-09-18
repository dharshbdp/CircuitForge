import * as Blockly from 'blockly'

export interface SerializedWorkspace {
  version: string
  timestamp: string
  blockCount: number
  state: Record<string, unknown>
}

export function serializeWorkspace(workspace: Blockly.WorkspaceSvg): SerializedWorkspace {
  const state = Blockly.serialization.workspaces.save(workspace)
  const blockCount = workspace.getAllBlocks(false).length

  return {
    version: '0.2',
    timestamp: new Date().toISOString(),
    blockCount,
    state
  }
}

export function loadWorkspace(
  workspace: Blockly.WorkspaceSvg,
  serialized: SerializedWorkspace
): void {
  workspace.clear()
  if (serialized && serialized.state) {
    Blockly.serialization.workspaces.load(serialized.state, workspace)
  }
}
