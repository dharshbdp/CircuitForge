import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'

// Dark Monochromatic Theme
const DarkMonochromeTheme = Blockly.Theme.defineTheme('cf_dark', {
  name: 'cf_dark',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#09090b',
    toolboxBackgroundColour: '#141416',
    toolboxForegroundColour: '#f4f4f6',
    flyoutBackgroundColour: '#111113',
    flyoutForegroundColour: '#f4f4f6',
    flyoutOpacity: 0.95,
    scrollbarColour: '#27272a',
    insertionMarkerColour: '#ffffff',
    insertionMarkerOpacity: 0.4,
    scrollbarOpacity: 0.7,
    cursorColour: '#ffffff'
  },
  blockStyles: {
    logic_blocks: {
      colourPrimary: '#27272a',
      colourSecondary: '#3f3f46',
      colourTertiary: '#18181b'
    },
    loop_blocks: {
      colourPrimary: '#3f3f46',
      colourSecondary: '#52525b',
      colourTertiary: '#27272a'
    },
    math_blocks: {
      colourPrimary: '#27272a',
      colourSecondary: '#3f3f46',
      colourTertiary: '#18181b'
    },
    text_blocks: {
      colourPrimary: '#3f3f46',
      colourSecondary: '#52525b',
      colourTertiary: '#27272a'
    },
    variable_blocks: {
      colourPrimary: '#27272a',
      colourSecondary: '#3f3f46',
      colourTertiary: '#18181b'
    },
    procedure_blocks: {
      colourPrimary: '#3f3f46',
      colourSecondary: '#52525b',
      colourTertiary: '#27272a'
    }
  },
  fontStyle: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    weight: '600',
    size: 11
  }
})

// Light Monochromatic Theme
const LightMonochromeTheme = Blockly.Theme.defineTheme('cf_light', {
  name: 'cf_light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#f8f9fa',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#121212',
    flyoutBackgroundColour: '#ffffff',
    flyoutForegroundColour: '#121212',
    flyoutOpacity: 0.95,
    scrollbarColour: '#ced4da',
    insertionMarkerColour: '#121212',
    insertionMarkerOpacity: 0.4,
    scrollbarOpacity: 0.7,
    cursorColour: '#121212'
  },
  blockStyles: {
    logic_blocks: {
      colourPrimary: '#dee2e6',
      colourSecondary: '#ced4da',
      colourTertiary: '#e9ecef'
    },
    loop_blocks: {
      colourPrimary: '#ced4da',
      colourSecondary: '#adb5bd',
      colourTertiary: '#dee2e6'
    },
    math_blocks: {
      colourPrimary: '#dee2e6',
      colourSecondary: '#ced4da',
      colourTertiary: '#e9ecef'
    },
    text_blocks: {
      colourPrimary: '#ced4da',
      colourSecondary: '#adb5bd',
      colourTertiary: '#dee2e6'
    },
    variable_blocks: {
      colourPrimary: '#dee2e6',
      colourSecondary: '#ced4da',
      colourTertiary: '#e9ecef'
    },
    procedure_blocks: {
      colourPrimary: '#ced4da',
      colourSecondary: '#adb5bd',
      colourTertiary: '#dee2e6'
    }
  },
  fontStyle: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    weight: '600',
    size: 11
  }
})

// Initial Toolbox Specification
const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Logic',
      colour: '#71717a',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' }
      ]
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: '#71717a',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' }
      ]
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '#71717a',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_single' }
      ]
    },
    {
      kind: 'category',
      name: 'Text',
      colour: '#71717a',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_print' }
      ]
    },
    {
      kind: 'category',
      name: 'Variables',
      custom: 'VARIABLE',
      colour: '#71717a'
    }
  ]
}

export interface BlocklyWorkspaceProps {
  theme: 'light' | 'dark'
  onWorkspaceChange?: (workspace: Blockly.WorkspaceSvg) => void
  workspaceRef?: React.MutableRefObject<Blockly.WorkspaceSvg | null>
}

export default function BlocklyWorkspace({
  theme,
  onWorkspaceChange,
  workspaceRef
}: BlocklyWorkspaceProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  // Initialize Blockly Workspace
  useEffect(() => {
    if (!containerRef.current) return

    const selectedTheme = theme === 'dark' ? DarkMonochromeTheme : LightMonochromeTheme

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: toolboxConfig,
      grid: {
        spacing: 24,
        length: 2,
        colour: theme === 'dark' ? '#222226' : '#dee2e6',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 2.5,
        minScale: 0.4,
        scaleSpeed: 1.2
      },
      trashcan: true,
      theme: selectedTheme,
      sounds: false
    })

    innerWorkspaceRef.current = workspace
    if (workspaceRef) {
      workspaceRef.current = workspace
    }

    // Change listener
    const changeListener = (): void => {
      if (onWorkspaceChange) {
        onWorkspaceChange(workspace)
      }
    }
    workspace.addChangeListener(changeListener)

    // Resize observer to handle dynamic pane resizing
    const resizeObserver = new ResizeObserver(() => {
      Blockly.svgResize(workspace)
    })
    resizeObserver.observe(containerRef.current)

    // Initial resize
    setTimeout(() => {
      Blockly.svgResize(workspace)
    }, 50)

    return () => {
      workspace.removeChangeListener(changeListener)
      resizeObserver.disconnect()
      workspace.dispose()
      innerWorkspaceRef.current = null
      if (workspaceRef) {
        workspaceRef.current = null
      }
    }
  }, []) // Mount once

  // Synchronize Theme dynamically
  useEffect(() => {
    if (innerWorkspaceRef.current) {
      const selectedTheme = theme === 'dark' ? DarkMonochromeTheme : LightMonochromeTheme
      innerWorkspaceRef.current.setTheme(selectedTheme)
      Blockly.svgResize(innerWorkspaceRef.current)
    }
  }, [theme])

  return (
    <div className="cf-blockly-container" ref={containerRef}>
      {/* Blockly injects its SVG canvas directly here */}
    </div>
  )
}
