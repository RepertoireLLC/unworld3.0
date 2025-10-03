import sodium from 'libsodium-wrappers-sumo';

let initialized = false;

export async function ensureSodiumReady() {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
  return sodium;
}

export type Sodium = Awaited<ReturnType<typeof ensureSodiumReady>>;
