/**
 * Browser cryptography compatibility installed before client plugins load.
 * @module @deepseek-ai/dsh-client-web/browser-crypto
 */

/**
 * Supply `crypto.randomUUID()` when an insecure HTTP origin omits it.
 * `crypto.getRandomValues()` remains available there and provides the entropy
 * for an RFC 4122 version 4 UUID. Native implementations remain untouched.
 */
export function installBrowserCryptoCompatibility(): void {
  if (typeof globalThis.crypto.randomUUID === 'function') return

  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: (): string => {
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x40)
      view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80)
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    },
  })
}
