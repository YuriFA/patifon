type Listener = (...args: never[]) => void;

export default class EventEmitter {
  private readonly events = new Map<string, Listener[]>();

  on(event: string, callback: Listener): this {
    const listeners = this.events.get(event) ?? [];
    listeners.push(callback);
    this.events.set(event, listeners);
    return this;
  }

  off(event: string, callback: Listener): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const snapshot = [...listeners];
      for (const callback of snapshot) {
        (callback as (...a: unknown[]) => void)(...args);
      }
    }
    return this;
  }
}
