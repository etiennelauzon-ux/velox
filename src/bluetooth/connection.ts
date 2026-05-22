import { status, log } from '@/ui/domHelpers';
import { bluetoothState, setTrainerConnected, setHRMConnected } from '@/state/bluetoothState';
import { appStoreApi } from '@/state/useAppStore';
import { parseBike, parseHr } from './parsers';

export function bluetoothDiagnostic(): string {
  if (!window.isSecureContext) return 'Web Bluetooth needs localhost or HTTPS.';
  if (!navigator.bluetooth)    return 'Web Bluetooth not available. Use Chrome or Edge desktop.';
  return '';
}

export async function connectTrainer(): Promise<void> {
  const prob = bluetoothDiagnostic();
  if (prob) { status(prob); return; }

  try {
    status('Scanning for FTMS trainer…');
    const dev = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['fitness_machine'],
    });

    bluetoothState.trainer = dev;
    dev.addEventListener('gattserverdisconnected', () => {
      setTrainerConnected(false);
      document.getElementById('dot')?.classList.remove('on');
      status('Trainer disconnected');
    });

    const server = await dev.gatt!.connect();
    bluetoothState.server = server;
    const ftms = await server.getPrimaryService('fitness_machine');
    const bike = await ftms.getCharacteristic('00002ad2-0000-1000-8000-00805f9b34fb');
    bike.addEventListener('characteristicvaluechanged', parseBike);
    await bike.startNotifications();
    bluetoothState.bikeChar = bike;

    try {
      bluetoothState.ctrlChar = await ftms.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');
      await bluetoothState.ctrlChar.startNotifications();
      await bluetoothState.ctrlChar.writeValueWithResponse(new Uint8Array([0x00]));
    } catch {
      log('Trainer control point unavailable');
    }

    setTrainerConnected(true);
    appStoreApi.getState().setTrainer({ lastTrainerName: dev.name || 'FTMS device' });
    document.getElementById('dot')?.classList.add('on');
    const btn = document.getElementById('trainerBtn');
    if (btn) btn.textContent = dev.name || 'Trainer Connected';
    status('Trainer connected: ' + (dev.name || 'FTMS device'));
  } catch (e) {
    const err = e as Error;
    appStoreApi.getState().reportError('bluetooth', err);
    if (err.name !== 'NotFoundError') status('Trainer error: ' + err.message);
  }
}

export async function connectGattWithRetry(dev: BluetoothDevice, label: string): Promise<BluetoothRemoteGATTServer> {
  let last: Error | undefined;
  for (let i = 1; i <= 3; i++) {
    try {
      if (dev.gatt?.connected) dev.gatt.disconnect();
      await new Promise(r => setTimeout(r, i === 1 ? 100 : 700));
      status(`${label} GATT connect attempt ${i}`);
      return await dev.gatt!.connect();
    } catch (e) {
      last = e as Error;
      log(`${label} attempt ${i} failed: ${(e as Error).name}`);
    }
  }
  throw last;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

function garminHrmTip(dev: BluetoothDevice | null): string {
  return dev?.name?.toLowerCase().includes('garmin') ? ' (Garmin HRM: try pairing in Bluetooth settings first)' : '';
}

export async function connectHrm(): Promise<void> {
  const prob = bluetoothDiagnostic();
  if (prob) { status(prob); return; }

  try {
    status('Scanning for HRM…');
    const dev = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
    });

    bluetoothState.hrm = dev;
    const server = await withTimeout(connectGattWithRetry(dev, 'HRM'), 30_000, 'HRM connect');
    bluetoothState.hrServer = server;
    const svc = await withTimeout(server.getPrimaryService('heart_rate'), 12_000, 'HR service');
    const chr = await withTimeout(svc.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb'), 12_000, 'HR char');
    chr.addEventListener('characteristicvaluechanged', parseHr);
    await withTimeout(chr.startNotifications(), 12_000, 'HR notifications');
    setHRMConnected(true);
    const btn = document.getElementById('hrmBtn');
    if (btn) btn.textContent = dev.name || 'HRM Connected';
    status('HRM connected: ' + (dev.name || 'Heart Rate'));
  } catch (e) {
    const err = e as Error;
    appStoreApi.getState().reportError('bluetooth', err);
    if (err.name !== 'NotFoundError') status('HRM error: ' + err.name + ' ' + err.message + garminHrmTip(bluetoothState.hrm));
  }
}
