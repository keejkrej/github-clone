import { concatBytes, toHex, utf8 } from "./bytes"
import type { GitObjectType } from "./types"

function rotl(n: number, x: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/** SHA-1 of raw bytes. Pure JS so the engine runs in Node tests and the browser. */
export function sha1(bytes: Uint8Array): string {
  const ml = bytes.length
  const bitLenHi = Math.floor(ml / 0x20000000)
  const bitLenLo = (ml << 3) >>> 0
  const padLen = ((ml + 8) >> 6 << 6) + 64
  const padded = new Uint8Array(padLen)
  padded.set(bytes)
  padded[ml] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padLen - 8, bitLenHi)
  view.setUint32(padLen - 4, bitLenLo)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)

  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4)
    }
    for (let t = 16; t < 80; t++) {
      w[t] = rotl(1, w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16])
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let t = 0; t < 80; t++) {
      let f: number
      let k: number
      if (t < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (t < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (rotl(5, a) + f + e + k + w[t]) >>> 0
      e = d
      d = c
      c = rotl(30, b)
      b = a
      a = temp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  const digest = new Uint8Array(20)
  const out = new DataView(digest.buffer)
  out.setUint32(0, h0)
  out.setUint32(4, h1)
  out.setUint32(8, h2)
  out.setUint32(12, h3)
  out.setUint32(16, h4)
  return toHex(digest)
}

export function hashObject(type: GitObjectType, payload: Uint8Array | string): string {
  const content = typeof payload === "string" ? utf8(payload) : payload
  const header = utf8(`${type} ${content.byteLength}`)
  const stored = concatBytes([header, Uint8Array.of(0), content])
  return sha1(stored)
}
