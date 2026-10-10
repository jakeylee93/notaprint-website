/**
 * Event de-duplication. Stripe may deliver the same event more than once, so each event id is
 * claimed exactly once before it is processed.
 *
 * MemoryEventLedger is the zero-infrastructure default for the preview. It is per-instance, so
 * the dry-run step also writes a durable marker into PaymentIntent metadata (see webhook.ts).
 * Swap in a database-backed ledger (unique key on event id) before launch.
 */
export interface EventLedger {
  claim(eventId: string): Promise<boolean>;
  release(eventId: string): Promise<void>;
}

export class MemoryEventLedger implements EventLedger {
  private seen = new Map<string, number>();
  constructor(private ttlMs = 72 * 60 * 60 * 1000) {}

  async claim(eventId: string): Promise<boolean> {
    const now = Date.now();
    for (const [id, at] of this.seen) if (now - at > this.ttlMs) this.seen.delete(id);
    if (this.seen.has(eventId)) return false;
    this.seen.set(eventId, now);
    return true;
  }

  async release(eventId: string): Promise<void> {
    this.seen.delete(eventId);
  }
}
