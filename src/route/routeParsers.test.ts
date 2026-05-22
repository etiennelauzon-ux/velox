import { describe, it, expect } from 'vitest';
import { parseFitPoints } from './routeParsers';

function makeEmptyFitFile(): ArrayBuffer {
  const bytes = new Uint8Array(14);
  bytes[0] = 12; // header length
  bytes[1] = 0; // protocol version
  bytes[2] = 0; // profile version low
  bytes[3] = 0; // profile version high
  bytes[4] = 0; // data length low
  bytes[5] = 0; // data length
  bytes[6] = 0; // data length
  bytes[7] = 0; // data length
  bytes[8] = 0x2e; // '.'
  bytes[9] = 0x46; // 'F'
  bytes[10] = 0x49; // 'I'
  bytes[11] = 0x54; // 'T'
  bytes[12] = 0; // crc low
  bytes[13] = 0; // crc high
  return bytes.buffer;
}

describe('routeParsers', () => {
  it('parses a minimal FIT file without throwing', async () => {
    const points = await parseFitPoints(makeEmptyFitFile());
    expect(points).toEqual([]);
  });
});
