import { log } from '@/ui/domHelpers';
import { bluetoothState } from '@/state/bluetoothState';
import { rideState } from '@/state/rideState';
import { clamp } from '@/physics/physicsEngine';

export async function sendErg(w: number): Promise<void> {
  rideState.ergWatts = Math.round(clamp(w, 50, 1500));
  const inp = document.getElementById('ergWatts') as HTMLInputElement | null;
  if (inp) inp.value = String(rideState.ergWatts);
  if (!bluetoothState.ctrlChar) return;
  try {
    await bluetoothState.ctrlChar.writeValueWithResponse(
      new Uint8Array([0x05, rideState.ergWatts & 255, (rideState.ergWatts >> 8) & 255])
    );
  } catch (e) {
    log('ERG write failed: ' + (e as Error).message);
  }
}

export function gradeWatts(grade: number): number {
  return clamp(rideState.ergWatts + grade * 18, 70, 800);
}
