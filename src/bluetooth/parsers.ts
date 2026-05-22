import { rideState } from '@/state/rideState';
import { sample } from './sample';

export function parseBike(ev: Event): void {
  const v = (ev.target as BluetoothRemoteGATTCharacteristic).value!;
  const flags = v.getUint16(0, true);
  let o = 2;
  if (!(flags & 1))  { rideState.trainerSpeed = v.getUint16(o, true) * 0.01; o += 2; }
  if (flags & 2)   o += 2;
  if (flags & 4)   { rideState.cadence = v.getUint16(o, true) * 0.5; o += 2; }
  if (flags & 8)   o += 2;
  if (flags & 16)  o += 3;
  if (flags & 32)  o += 2;
  if (flags & 64)  { rideState.power = Math.max(0, v.getInt16(o, true)); o += 2; }
  if (flags & 128) o += 2;
  if (flags & 256) { const c = v.getUint16(o, true); if (c !== 0xffff) rideState.calories = c; o += 5; }
  if (flags & 512) { rideState.hr = v.getUint8(o); }
  void sample();
}

export function parseHr(ev: Event): void {
  const v = (ev.target as BluetoothRemoteGATTCharacteristic).value!;
  const f = v.getUint8(0);
  rideState.hr = (f & 1) ? v.getUint16(1, true) : v.getUint8(1);
}
