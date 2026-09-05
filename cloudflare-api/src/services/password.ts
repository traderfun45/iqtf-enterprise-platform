import { scryptAsync } from '@noble/hashes/scrypt'

const KEY_LENGTH = 64

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex length')
  }

  const bytes = new Uint8Array(hex.length / 2)

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }

  return bytes
}

function constantTimeEqual(
  a: Uint8Array,
  b: Uint8Array,
): boolean {
  if (a.length !== b.length) {
    return false
  }

  let diff = 0

  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }

  return diff === 0
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, keyHex] = storedHash.split(':')

  if (!saltHex || !keyHex) {
    return false
  }

  let salt: Uint8Array
  let storedKey: Uint8Array

  try {
    salt = hexToBytes(saltHex)
    storedKey = hexToBytes(keyHex)
  } catch {
    return false
  }

  if (storedKey.length !== KEY_LENGTH) {
    return false
  }

  const derivedKey = await scryptAsync(
    password,
    salt,
    {
      N: 16384,
      r: 8,
      p: 1,
      dkLen: KEY_LENGTH,
    },
  )

  return constantTimeEqual(derivedKey, storedKey)
}
