/**
 * One call of `load` per session: every caller gets the same promise. A failed load is evicted, so the next call
 * retries (the reports' loaders and the freight report's dataset).
 */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= load();
    pending.catch(() => (pending = undefined));
    return pending;
  };
}
