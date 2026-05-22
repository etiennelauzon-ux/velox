// src/state/recordingState.ts — isolated ride recording state
import type { RideRecord } from '@/types';
import { Store } from './store';

export interface RecordingState {
  recording: boolean;
  records: RideRecord[];
  history: RideRecord[][];
  elapsed: number;
  startMs: number;
  lastTs: number;
  timer: ReturnType<typeof setInterval> | null;
}

export const recordingState: RecordingState = {
  recording: false,
  records: [],
  history: [],
  elapsed: 0,
  startMs: 0,
  lastTs: 0,
  timer: null,
};

export function startRecording(): void {
  recordingState.recording = true;
  recordingState.records = [];
  recordingState.history = [];
  recordingState.elapsed = 0;
  recordingState.startMs = Date.now();
  recordingState.lastTs = 0;
  if (recordingState.timer) clearInterval(recordingState.timer);
  recordingState.timer = setInterval(() => {
    recordingState.elapsed = Math.floor((Date.now() - recordingState.startMs) / 1000);
    Store.emit({ type: 'recording-tick' });
  }, 1000);
  Store.emit({ type: 'recording-change' });
}

export function stopRecording(): void {
  recordingState.recording = false;
  if (recordingState.timer) { clearInterval(recordingState.timer); recordingState.timer = null; }
  Store.emit({ type: 'recording-change' });
}

export function pushRecord(r: RideRecord): void {
  recordingState.records.push(r);
  Store.emit({ type: 'recording-records' });
}

export function pushHistory(session: RideRecord[]): void {
  recordingState.history.push(session.slice());
  if (recordingState.history.length > 50) recordingState.history.shift();
}

export function resetRecording(): void {
  recordingState.recording = false;
  recordingState.records = [];
  recordingState.history = [];
  recordingState.elapsed = 0;
  recordingState.startMs = 0;
  recordingState.lastTs = 0;
  if (recordingState.timer) { clearInterval(recordingState.timer); recordingState.timer = null; }
  Store.emit({ type: 'recording-change' });
}

export default recordingState;
