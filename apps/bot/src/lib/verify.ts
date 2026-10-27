import nacl from "tweetnacl";

/** Verify Discord Interaction ed25519 signature. */
export function verifyDiscordRequest(
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string,
): boolean {
  if (!signature || !timestamp || !publicKeyHex) return false;
  try {
    const message = new TextEncoder().encode(timestamp + body);
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKeyHex);
    return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}
