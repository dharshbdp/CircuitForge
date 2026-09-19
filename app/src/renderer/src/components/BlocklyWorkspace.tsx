import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import '@core/blocks'

// Fixed preview scale for the toolbox dock flyout
const FIXED_FLYOUT_SCALE = 0.85

interface FlyoutLayoutItem {
  getElement(): {
    moveBy(x: number, y: number): void
    getBoundingRectangle(): { getHeight(): number }
  }
}

interface VerticalFlyoutInternal {
  workspace_: Blockly.WorkspaceSvg
  tabWidth_: number
  MARGIN: number
  RTL: boolean
  getFlyoutScale(): number
}

// 1. Decouple base Flyout scale from targetWorkspace.scale
if (Blockly.Flyout?.prototype) {
  const flyoutProto = Blockly.Flyout.prototype as unknown as { getFlyoutScale: () => number }
  flyoutProto.getFlyoutScale = function (): number {
    return FIXED_FLYOUT_SCALE
  }
}

// 2. Register CircuitForgeFlyout with Blockly registry
class CircuitForgeFlyout extends Blockly.VerticalFlyout {
  override getFlyoutScale(): number {
    return FIXED_FLYOUT_SCALE
  }

  protected override layout_(contents: FlyoutLayoutItem[]): void {
    const self = this as unknown as VerticalFlyoutInternal
    if (self.workspace_) {
      self.workspace_.scale = this.getFlyoutScale()
    }
    const margin = self.MARGIN
    const tabWidth = self.tabWidth_ || 0
    const x = self.RTL ? margin : margin + tabWidth
    let y = margin
    for (const item of contents) {
      const el = item.getElement()
      el.moveBy(x, y)
      y += el.getBoundingRectangle().getHeight()
    }
  }

  protected override reflowInternal_(): void {
    super.reflowInternal_()
    const self = this as unknown as VerticalFlyoutInternal
    const ws = self.workspace_
    if (ws && typeof ws.translate === 'function') {
      ws.translate(ws.scrollX, ws.scrollY)
    }
  }
}

Blockly.registry.register(
  Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
  Blockly.registry.DEFAULT,
  CircuitForgeFlyout,
  true
)

// 3. Hook Zelos ConstantProvider for dynamic dark/light fieldBorderRectColour
interface ZelosConstantProviderInternal {
  FIELD_BORDER_RECT_COLOUR: string
  init(): void
  setDynamicProperties_(theme: Blockly.Theme): void
}

if (Blockly.zelos?.ConstantProvider?.prototype) {
  const proto = Blockly.zelos.ConstantProvider.prototype as unknown as ZelosConstantProviderInternal
  const origInit = proto.init
  proto.init = function (): void {
    origInit.call(this)
    this.FIELD_BORDER_RECT_COLOUR = '#141418'
  }

  const origSetDynamic = proto.setDynamicProperties_
  proto.setDynamicProperties_ = function (theme: Blockly.Theme): void {
    origSetDynamic.call(this, theme)
    const customFieldBorder = theme.getComponentStyle?.('fieldBorderRectColour')
    if (customFieldBorder) {
      this.FIELD_BORDER_RECT_COLOUR = customFieldBorder
    }
  }
}

// Modern Monochromatic Dark Theme (Zelos base)
const DarkMonochromeTheme = Blockly.Theme.defineTheme('cf_dark', {
  name: 'cf_dark',
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: '#09090b',
    toolboxBackgroundColour: '#111114',
    toolboxForegroundColour: '#f4f4f6',
    flyoutBackgroundColour: '#111114',
    flyoutForegroundColour: '#f4f4f6',
    flyoutOpacity: 0.98,
    scrollbarColour: '#27272a',
    insertionMarkerColour: '#ffffff',
    insertionMarkerOpacity: 0.8,
    scrollbarOpacity: 0.6,
    cursorColour: '#ffffff',
    selectedGlowColour: '#ffffff',
    selectedGlowOpacity: 0.4,
    fieldBorderRectColour: '#141418'
  } as unknown as Blockly.Theme.ComponentStyle,
  blockStyles: {
    gpio_blocks: {
      colourPrimary: '#18181c',
      colourSecondary: '#2b2b32',
      colourTertiary: '#101012'
    },
    timing_blocks: {
      colourPrimary: '#222227',
      colourSecondary: '#35353e',
      colourTertiary: '#141417'
    },
    sensor_blocks: {
      colourPrimary: '#282830',
      colourSecondary: '#3d3d49',
      colourTertiary: '#17171c'
    },
    actuator_blocks: {
      colourPrimary: '#1f1f25',
      colourSecondary: '#31313c',
      colourTertiary: '#121216'
    },
    serial_blocks: {
      colourPrimary: '#1a1a1f',
      colourSecondary: '#2d2d36',
      colourTertiary: '#111113'
    },
    logic_blocks: {
      colourPrimary: '#202026',
      colourSecondary: '#33333d',
      colourTertiary: '#131317'
    },
    loop_blocks: {
      colourPrimary: '#26262d',
      colourSecondary: '#3a3a46',
      colourTertiary: '#16161a'
    },
    math_blocks: {
      colourPrimary: '#1d1d23',
      colourSecondary: '#2f2f39',
      colourTertiary: '#111115'
    },
    text_blocks: {
      colourPrimary: '#24242b',
      colourSecondary: '#373742',
      colourTertiary: '#151519'
    },
    variable_blocks: {
      colourPrimary: '#2a2a33',
      colourSecondary: '#40404e',
      colourTertiary: '#18181e'
    },
    procedure_blocks: {
      colourPrimary: '#222228',
      colourSecondary: '#35353f',
      colourTertiary: '#141417'
    }
  },
  fontStyle: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    weight: '600',
    size: 11
  }
})

// Modern Monochromatic Light Theme (Zelos base)
const LightMonochromeTheme = Blockly.Theme.defineTheme('cf_light', {
  name: 'cf_light',
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: '#f8f9fa',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#121212',
    flyoutBackgroundColour: '#ffffff',
    flyoutForegroundColour: '#121212',
    flyoutOpacity: 0.98,
    scrollbarColour: '#ced4da',
    insertionMarkerColour: '#121212',
    insertionMarkerOpacity: 0.8,
    scrollbarOpacity: 0.6,
    cursorColour: '#121212',
    selectedGlowColour: '#121212',
    selectedGlowOpacity: 0.35,
    fieldBorderRectColour: '#ffffff'
  } as unknown as Blockly.Theme.ComponentStyle,
  blockStyles: {
    gpio_blocks: {
      colourPrimary: '#ffffff',
      colourSecondary: '#e2e5e9',
      colourTertiary: '#f1f3f5'
    },
    timing_blocks: {
      colourPrimary: '#f8f9fa',
      colourSecondary: '#d8dce2',
      colourTertiary: '#ebedf0'
    },
    sensor_blocks: {
      colourPrimary: '#f1f3f5',
      colourSecondary: '#cfd4dc',
      colourTertiary: '#e2e6eb'
    },
    actuator_blocks: {
      colourPrimary: '#ffffff',
      colourSecondary: '#d8dce2',
      colourTertiary: '#edf0f4'
    },
    serial_blocks: {
      colourPrimary: '#f8f9fa',
      colourSecondary: '#d8dce2',
      colourTertiary: '#ebedf0'
    },
    logic_blocks: {
      colourPrimary: '#ffffff',
      colourSecondary: '#e0e4e8',
      colourTertiary: '#eff2f5'
    },
    loop_blocks: {
      colourPrimary: '#f3f4f6',
      colourSecondary: '#d0d5dd',
      colourTertiary: '#e4e7eb'
    },
    math_blocks: {
      colourPrimary: '#ffffff',
      colourSecondary: '#dde2e7',
      colourTertiary: '#edf0f4'
    },
    text_blocks: {
      colourPrimary: '#f8f9fa',
      colourSecondary: '#d8dce2',
      colourTertiary: '#ebedf0'
    },
    variable_blocks: {
      colourPrimary: '#f1f3f5',
      colourSecondary: '#cfd4dc',
      colourTertiary: '#e2e6eb'
    },
    procedure_blocks: {
      colourPrimary: '#ffffff',
      colourSecondary: '#d8dce2',
      colourTertiary: '#edf0f4'
    }
  },
  fontStyle: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    weight: '600',
    size: 11
  }
})

// Curated Toolbox Specification with Modern Monochromatic Badges
const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'GPIO / Pins',
      colour: '#52525b',
      contents: [
        { kind: 'block', type: 'pin_set_mode' },
        { kind: 'block', type: 'pin_digital_write' },
        { kind: 'block', type: 'pin_digital_read' },
        {
          kind: 'block',
          type: 'pin_analog_write',
          inputs: {
            VALUE: { shadow: { type: 'math_number', fields: { NUM: 128 } } }
          }
        },
        { kind: 'block', type: 'pin_analog_read' }
      ]
    },
    {
      kind: 'category',
      name: 'Timing',
      colour: '#71717a',
      contents: [
        {
          kind: 'block',
          type: 'time_delay',
          inputs: {
            DELAY_MS: { shadow: { type: 'math_number', fields: { NUM: 1000 } } }
          }
        },
        {
          kind: 'block',
          type: 'time_delay_micros',
          inputs: {
            DELAY_US: { shadow: { type: 'math_number', fields: { NUM: 10 } } }
          }
        },
        { kind: 'block', type: 'time_millis' }
      ]
    },
    {
      kind: 'category',
      name: 'Sensors',
      colour: '#a1a1aa',
      contents: [
        { kind: 'block', type: 'sensor_ultrasonic' },
        { kind: 'block', type: 'sensor_dht' },
        { kind: 'block', type: 'sensor_light_ldr' },
        { kind: 'block', type: 'sensor_pir' },
        { kind: 'block', type: 'sensor_mq2_read' },
        { kind: 'block', type: 'sensor_mq2_digital' },
        {
          kind: 'block',
          type: 'sensor_mq2_warmup',
          inputs: {
            SECONDS: { shadow: { type: 'math_number', fields: { NUM: 20 } } }
          }
        }
      ]
    },
    {
      kind: 'category',
      name: 'Actuators & Display',
      colour: '#8e8e93',
      contents: [
        {
          kind: 'block',
          type: 'actuator_servo',
          inputs: {
            ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } }
          }
        },
        { kind: 'block', type: 'actuator_relay' },
        {
          kind: 'block',
          type: 'neopixel_init',
          inputs: {
            COUNT: { shadow: { type: 'math_number', fields: { NUM: 8 } } }
          }
        },
        {
          kind: 'block',
          type: 'neopixel_set_color',
          inputs: {
            PIXEL: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            RED: { shadow: { type: 'math_number', fields: { NUM: 255 } } },
            GREEN: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            BLUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } }
          }
        },
        { kind: 'block', type: 'neopixel_clear' }
      ]
    },
    {
      kind: 'category',
      name: 'Serial I/O',
      colour: '#52525b',
      contents: [
        {
          kind: 'block',
          type: 'serial_print',
          inputs: {
            CONTENT: { shadow: { type: 'text', fields: { TEXT: 'Hello CircuitForge' } } }
          }
        }
      ]
    },
    { kind: 'sep' },
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
      colour: '#a1a1aa',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' }
      ]
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '#52525b',
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
      colour: '#a1a1aa'
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
  const onWorkspaceChangeRef = useRef(onWorkspaceChange)

  useEffect(() => {
    onWorkspaceChangeRef.current = onWorkspaceChange
  }, [onWorkspaceChange])

  // Initialize Modern Blockly Workspace with Zelos renderer
  useEffect(() => {
    if (!containerRef.current) return

    const selectedTheme = theme === 'dark' ? DarkMonochromeTheme : LightMonochromeTheme

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: toolboxConfig,
      renderer: 'zelos',
      grid: {
        spacing: 24,
        length: 2,
        colour: theme === 'dark' ? '#222226' : '#dee2e6',
        snap: true
      },
      zoom: {
        controls: false,
        wheel: true,
        startScale: 0.95,
        maxScale: 2.5,
        minScale: 0.4,
        scaleSpeed: 1.2
      },
      trashcan: false,
      theme: selectedTheme,
      sounds: false
    })

    // Ensure the flyout instance explicitly stays at FIXED_FLYOUT_SCALE
    const flyout = workspace.getFlyout() as unknown as VerticalFlyoutInternal | null
    if (flyout) {
      flyout.getFlyoutScale = (): number => FIXED_FLYOUT_SCALE
      if (flyout.workspace_) {
        flyout.workspace_.scale = FIXED_FLYOUT_SCALE
        if (typeof flyout.workspace_.translate === 'function') {
          flyout.workspace_.translate(flyout.workspace_.scrollX, flyout.workspace_.scrollY)
        }
      }
    }

    innerWorkspaceRef.current = workspace
    if (workspaceRef) {
      workspaceRef.current = workspace
    }

    // Change listener
    const changeListener = (e?: Blockly.Events.Abstract): void => {
      if (e && e.isUiEvent) return
      if (onWorkspaceChangeRef.current) {
        onWorkspaceChangeRef.current(workspace)
      }
    }
    workspace.addChangeListener(changeListener)

    // Trigger initial code generation on mount
    changeListener()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount once to maintain persistent user canvas state

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
      {/* Modern Zelos Blockly canvas injected here */}
    </div>
  )
}
