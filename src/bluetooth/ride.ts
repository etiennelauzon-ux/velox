import { status } from '@/ui/domHelpers';
import { startRecording, stopRecording } from '@/state/recordingState';
import recordingState from '@/state/recordingState';
import { rideState } from '@/state/rideState';
import { routeState } from '@/state/routeState';
import { bluetoothState } from '@/state/bluetoothState';

export function startRide(): void {
  if (!bluetoothState.connected && !rideState.demo) {
    status('Connect a trainer or start demo');
    return;
  }

  startRecording();
  recordingState.records = [];
  rideState.distance = 0;
  routeState.routeDistance = 0;
  rideState.vMps = 0;
  rideState.speed = 0;
  rideState.calories = 0;
  recordingState.elapsed = 0;
  recordingState.startMs = Date.now();
  recordingState.lastTs = 0;
  routeState.activeSegment = null;
  routeState.segmentTimes = {};

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.classList.add('danger');
    startBtn.textContent = 'Stop Ride';
  }
  document.getElementById('dot')?.classList.add('rec');
  (document.getElementById('gpxBtn') as HTMLButtonElement | null)!.disabled = true;
  (document.getElementById('fitBtn') as HTMLButtonElement | null)!.disabled = true;

  status('Recording started');
}

export function stopRide(): void {
  stopRecording();
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.classList.remove('danger');
    startBtn.textContent = 'Start Ride';
  }
  document.getElementById('dot')?.classList.remove('rec');
  const gpxBtn = document.getElementById('gpxBtn') as HTMLButtonElement | null;
  const fitBtn = document.getElementById('fitBtn') as HTMLButtonElement | null;
  if (gpxBtn) gpxBtn.disabled = !recordingState.records.length;
  if (fitBtn) fitBtn.disabled = !recordingState.records.length;
  status(`Recording stopped · ${recordingState.records.length} samples`);
}
