import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { recordingState, startRecording, stopRecording, pushRecord, pushHistory, resetRecording } from '@/state/recordingState';
import type { RideRecord } from '@/types';

describe('recordingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRecording();
  });

  afterEach(() => {
    if (recordingState.timer) clearInterval(recordingState.timer);
    vi.useRealTimers();
  });

  it('startRecording sets recording true and resets timer state', () => {
    startRecording();
    expect(recordingState.recording).toBe(true);
    expect(recordingState.records).toEqual([]);
    expect(recordingState.history).toEqual([]);
    expect(recordingState.elapsed).toBe(0);
    expect(recordingState.startMs).toBeGreaterThan(0);
    expect(recordingState.timer).not.toBeNull();
  });

  it('pushRecord appends records', () => {
    const record: RideRecord = { ts: 0, power: 100, hr: 100, speed: 10, cadence: 80, distance: 0, elapsed: 0 };
    pushRecord(record);
    expect(recordingState.records).toEqual([record]);
  });

  it('pushHistory appends history and caps at 50 entries', () => {
    for (let i = 0; i < 52; i++) {
      pushHistory([{ ts: i, power: 1, hr: 1, speed: 1, cadence: 1, distance: 1, elapsed: 1 }]);
    }
    expect(recordingState.history.length).toBe(50);
  });

  it('stopRecording clears the timer and disables recording', () => {
    startRecording();
    stopRecording();
    expect(recordingState.recording).toBe(false);
    expect(recordingState.timer).toBeNull();
  });

  it('resetRecording resets all fields to their initial values', () => {
    startRecording();
    pushRecord({ ts: 1, power: 1, hr: 1, speed: 1, cadence: 1, distance: 1, elapsed: 1 });
    pushHistory([{ ts: 1, power: 1, hr: 1, speed: 1, cadence: 1, distance: 1, elapsed: 1 }]);
    resetRecording();
    expect(recordingState).toMatchObject({
      recording: false,
      records: [],
      history: [],
      elapsed: 0,
      startMs: 0,
      lastTs: 0,
      timer: null,
    });
  });
});
