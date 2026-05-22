import { status } from '@/ui/domHelpers';
import { bluetoothState } from '@/state/bluetoothState';
import { rideState, setDemoMode } from '@/state/rideState';
import recordingState from '@/state/recordingState';
import { workoutState } from '@/workout/workoutState';
import { sample } from './sample';

let demoTimer: ReturnType<typeof setInterval> | null = null;

export function startDemo(): void {
  setDemoMode(true);
  recordingState.lastTs = 0;
  document.getElementById('dot')?.classList.add('on');
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.textContent = 'Stop Demo';

  let t = 0;
  demoTimer = setInterval(() => {
    t += 0.08;
    if (!workoutState.active) {
      const target = rideState.erg ? rideState.ergWatts : 210 + Math.sin(t) * 70 + Math.sin(t * 2.3) * 28;
      rideState.power = Math.max(0, Math.min(900, target + (Math.random() - 0.5) * 16));
    }
    rideState.cadence = 88 + Math.sin(t * 0.8) * 8 + (Math.random() - 0.5) * 3;
    rideState.hr = 132 + rideState.power * 0.11 + Math.sin(t * 0.25) * 5;
    void sample();
  }, 1000);

  status('Demo stream active');
}

export function stopDemo(): void {
  setDemoMode(false);
  if (demoTimer !== null) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  if (!bluetoothState.connected) document.getElementById('dot')?.classList.remove('on');
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.textContent = 'Start';
  status('Demo stopped');
}
