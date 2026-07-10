import AsyncStorage from './storage';

// A stable, anonymous per-install id. Used to key server-side preferences
// (push token, followed sources) and click analytics without requiring login.
const DEVICE_ID_KEY = '@dealmate/device_id';

let cached: string | null = null;

function randomId(): string {
  // RFC4122-ish v4 without crypto dependency — good enough for an anonymous key.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  cached = id;
  return id;
}
