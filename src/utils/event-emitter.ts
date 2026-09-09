type Listener<T> = (payload: T) => void;

/**
 * Minimal event emitter keyed by an event-name -> payload type map: all name
 * and payload checking happens at compile time through TEvents, the runtime
 * stays a plain Map of listener arrays with single-payload dispatch.
 */
export default class EventEmitter<TEvents extends Record<string, unknown>> {
  private readonly events = new Map<keyof TEvents, Listener<never>[]>();

  on<K extends keyof TEvents>(event: K, callback: Listener<TEvents[K]>): this {
    const listeners = this.events.get(event) ?? [];
    listeners.push(callback);
    this.events.set(event, listeners);
    return this;
  }

  off<K extends keyof TEvents>(event: K, callback: Listener<TEvents[K]>): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const snapshot = [...listeners];
      for (const callback of snapshot) {
        (callback as Listener<never>)(payload as never);
      }
    }
    return this;
  }
}
