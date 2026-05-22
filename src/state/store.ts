// src/state/store.ts — event bus extracted from appState

export type StoreChange = Partial<Record<string, unknown>> | { type: string };
export type Listener = (change: StoreChange) => void;

const listeners = new Set<Listener>();

export const Store = {
  emit(change: StoreChange): void {
    listeners.forEach(fn => fn(change));
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export default Store;
