/**
 * CircuitForge AI Copilot Module (Reserved for Milestone v1.0)
 * Provides context-aware circuit explanation and natural language to block synthesis.
 */

export interface CircuitExplanationRequest {
  boardId: string
  activeBlockCount: number
  generatedCode: string
}

export interface CircuitExplanationResponse {
  explanation: string
  wiringSteps: Array<{
    component: string
    sourcePin: string
    targetPin: string
    notes?: string
  }>
}

export interface PromptToBlocksRequest {
  userPrompt: string
  targetBoard: string
}
