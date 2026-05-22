// src/state/bluetoothState.ts — isolated Bluetooth/trainer connection state

export interface BluetoothState {
  trainer: BluetoothDevice | null;
  hrm: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  hrServer: BluetoothRemoteGATTServer | null;
  bikeChar: BluetoothRemoteGATTCharacteristic | null;
  ctrlChar: BluetoothRemoteGATTCharacteristic | null;
  connected: boolean;
  hrConnected: boolean;
  erg: boolean;
}

export const bluetoothState: BluetoothState = {
  trainer: null,
  hrm: null,
  server: null,
  hrServer: null,
  bikeChar: null,
  ctrlChar: null,
  connected: false,
  hrConnected: false,
  erg: false,
};

export function setTrainerConnected(connected: boolean): void {
  bluetoothState.connected = connected;
}

export function setHRMConnected(connected: boolean): void {
  bluetoothState.hrConnected = connected;
}

export function resetBluetooth(): void {
  bluetoothState.trainer = null;
  bluetoothState.hrm = null;
  bluetoothState.server = null;
  bluetoothState.hrServer = null;
  bluetoothState.bikeChar = null;
  bluetoothState.ctrlChar = null;
  bluetoothState.connected = false;
  bluetoothState.hrConnected = false;
}

export default bluetoothState;
