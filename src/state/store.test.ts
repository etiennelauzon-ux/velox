import { describe, it, expect } from 'vitest';
import { Store } from '@/state/store';

describe('Store', () => {
  it('subscribe registers a listener that receives emitted changes', () => {
    const change = { type: 'test' };
    let received: unknown = null;
    const unsubscribe = Store.subscribe(c => { received = c; });

    Store.emit(change);
    expect(received).toBe(change);
    unsubscribe();
  });

  it('unsubscribe removes the listener so it no longer receives emits', () => {
    const events: unknown[] = [];
    const unsubscribe = Store.subscribe(c => events.push(c));
    unsubscribe();
    Store.emit({ type: 'ignored' });
    expect(events).toEqual([]);
  });

  it('multiple listeners receive every emit', () => {
    const eventsA: unknown[] = [];
    const eventsB: unknown[] = [];
    const unsubscribeA = Store.subscribe(c => eventsA.push(c));
    const unsubscribeB = Store.subscribe(c => eventsB.push(c));

    const change = { type: 'multi' };
    Store.emit(change);

    expect(eventsA).toEqual([change]);
    expect(eventsB).toEqual([change]);

    unsubscribeA();
    unsubscribeB();
  });
});
