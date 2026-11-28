import { createStore, get, set } from "idb-keyval";

const store = createStore("inter-knot-board", "feeds");

export async function readStored<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await get<T>(key, store)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeStored<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch {
    // Storage can be unavailable or full. The session still works.
  }
}
