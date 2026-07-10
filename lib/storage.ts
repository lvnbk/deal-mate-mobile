import { createMMKV } from 'react-native-mmkv';

// Single MMKV instance backing all local persistence. MMKV is synchronous and
// JSI-backed (much faster than AsyncStorage), but we keep an AsyncStorage-shaped
// async facade below so call sites don't need to change their control flow.
const mmkv = createMMKV({ id: 'dealmate' });

/**
 * Drop-in replacement for the subset of the AsyncStorage API this app uses
 * (getItem / setItem / multiSet). Methods stay async so existing `await` call
 * sites keep working unchanged, even though MMKV resolves instantly.
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    return mmkv.getString(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    mmkv.set(key, value);
  },
  async multiSet(pairs: [string, string][]): Promise<void> {
    for (const [key, value] of pairs) mmkv.set(key, value);
  },
};

export default storage;
