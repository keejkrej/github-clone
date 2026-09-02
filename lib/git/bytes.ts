const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8")

export function utf8(text: string): Uint8Array {
  return encoder.encode(text)
}

export function utf8Decode(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  let length = 0
  for (const part of parts) length += part.byteLength
  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

export function toHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.toLowerCase()
  if (clean.length % 2 !== 0) {
    throw new Error(`invalid hex length ${clean.length}`)
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function isSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value)
}

export function zeroSha(): string {
  return "0".repeat(40)
}

export function normalizeSha(value: string | null | undefined): string | null {
  if (value == null || value === "" || value === zeroSha()) return null
  return value.toLowerCase()
}
