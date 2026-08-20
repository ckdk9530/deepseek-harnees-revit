/** Browser crypto compatibility required by non-secure LAN HTTP origins. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { installBrowserCryptoCompatibility } from '../src/browser-crypto.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('installBrowserCryptoCompatibility', () => {
  it('installs RFC 4122 version 4 randomUUID over getRandomValues', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        return bytes.fill(0xff)
      },
    })

    installBrowserCryptoCompatibility()

    expect(globalThis.crypto.randomUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('preserves the browser implementation when the origin exposes it', () => {
    const randomUUID = vi.fn(() => 'native-id')
    vi.stubGlobal('crypto', { randomUUID })

    installBrowserCryptoCompatibility()

    expect(globalThis.crypto.randomUUID()).toBe('native-id')
    expect(randomUUID).toHaveBeenCalledOnce()
  })
})
