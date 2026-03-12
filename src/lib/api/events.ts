export const DATA_UPDATE_EVENT = "trackhub:data-updated";

export function emitDataUpdate(): void {
  window.dispatchEvent(new CustomEvent(DATA_UPDATE_EVENT));
}

export function subscribeToDataUpdates(callback: () => void): () => void {
  window.addEventListener(DATA_UPDATE_EVENT, callback);
  return () => window.removeEventListener(DATA_UPDATE_EVENT, callback);
}
