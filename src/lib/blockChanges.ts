type BlockChange = { userId: string; blocked: boolean };
const listeners = new Set<(change: BlockChange) => void>();

export function publishBlockChange(change: BlockChange) {
  listeners.forEach(listener => listener(change));
}

export function subscribeBlockChanges(listener: (change: BlockChange) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
