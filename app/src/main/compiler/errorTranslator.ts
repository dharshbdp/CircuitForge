/**
 * Beginner-friendly GCC and Flash Tool error translator.
 * Converts cryptic compiler diagnostics into actionable, human-readable troubleshooting guidance.
 */
export function translateCompilerError(stderr: string, stdout: string = ''): string {
  const combined = `${stderr}\n${stdout}`

  // 1. Missing Libraries
  if (/fatal error:\s*([^\s:]+\.h):\s*No such file or directory/i.test(combined)) {
    const match = combined.match(/fatal error:\s*([^\s:]+\.h):\s*No such file or directory/i)
    const header = match ? match[1] : 'required library'
    return `Missing Library: The sketch requires header <${header}>. Ensure the corresponding sensor/actuator library is installed via the Library Manager.`
  }

  // 2. Syntax / Semicolon errors
  if (/error:\s*expected\s*['"]?;['"]?\s*before/i.test(combined)) {
    return 'Syntax Error: Missing semicolon (;) before the marked statement. Check the generated code block connections.'
  }

  // 3. Undeclared identifiers
  if (/error:\s*['"]?([a-zA-Z0-9_]+)['"]?\s*was not declared in this scope/i.test(combined)) {
    const match = combined.match(
      /error:\s*['"]?([a-zA-Z0-9_]+)['"]?\s*was not declared in this scope/i
    )
    const id = match ? match[1] : 'identifier'
    return `Variable / Object Error: '${id}' is used before being declared or initialized. Verify block order in your workspace.`
  }

  // 4. Arduino Uno / AVR upload programmer timeout
  if (/stk500_recv\(\)|stk500_getsync\(\)|programmer is not responding/i.test(combined)) {
    return 'Upload Failed: Microcontroller did not respond. Check that the correct COM port is selected, the board is firmly connected, and tap the RESET button on your Arduino.'
  }

  // 5. ESP32 bootloader handshake failure
  if (/Failed to connect to ESP32|Timed out waiting for packet header/i.test(combined)) {
    return 'ESP32 Upload Failed: Timed out waiting for bootloader. Hold down the "BOOT" (or "IO0") button on your ESP32 board while uploading begins.'
  }

  // 6. COM Port Locked / In Use
  if (/Access is denied|Permission denied|Resource temporarily unavailable/i.test(combined)) {
    return 'Port Access Denied: The selected COM port is currently locked by another application (e.g. Arduino IDE, PuTTY, or a serial monitor).'
  }

  // 7. Invalid FQBN or Board Core Not Installed
  if (/Platform '.*' not installed|Unknown FQBN/i.test(combined)) {
    return 'Board Core Missing: The compiler platform for the selected board is not installed in the toolchain. Run toolchain installation in CircuitForge.'
  }

  // 8. General compilation failure fallback
  const firstErrorLine = combined
    .split('\n')
    .find((line) => /error:/i.test(line) && !line.includes('warning:'))
  if (firstErrorLine) {
    return `Compilation Diagnostic: ${firstErrorLine.trim()}`
  }

  return 'Build / Upload terminated with errors. Review the detailed log output.'
}
