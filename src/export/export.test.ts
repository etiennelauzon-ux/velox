import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildGPX, buildFIT, download } from '@/export/export';
import type { RideRecord } from '@/types';

describe('export serialization', () => {
  const records: RideRecord[] = [
    { ts: 1680000000000, power: 150, hr: 140, speed: 8.5, cadence: 80, distance: 100, elapsed: 1, lat: 45.0, lon: -73.0, ele: 5 },
    { ts: 1680000060000, power: 160, hr: 145, speed: 8.7, cadence: 82, distance: 200, elapsed: 2, lat: 45.0001, lon: -73.0001, ele: 6 },
    { ts: 1680000120000, power: 170, hr: 150, speed: 9.0, cadence: 84, distance: 300, elapsed: 3, lat: 45.0002, lon: -73.0002, ele: 7 },
  ] as unknown as RideRecord[];

  it('builds GPX with required top-level XML structure and track metadata', () => {
    const output = buildGPX(records);

    expect(typeof output).toBe('string');
    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<gpx version="1.1" creator="VELOX Rider"');
    expect(output).toContain('<metadata>');
    expect(output).toContain('<trk>');
    expect(output).toContain('<trkseg>');
    expect(output).toContain('</trkseg>');
    expect(output).toContain('</gpx>');
  });

  it('renders one <trkpt> per ride record and includes position, elevation, time, HR, cadence, and power', () => {
    const output = buildGPX(records);
    const matches = output.match(/<trkpt /g) || [];

    expect(matches.length).toBe(records.length);
    expect(output).toContain('lat="45.0000000"');
    expect(output).toContain('lon="-73.0000000"');
    expect(output).toContain('<ele>5.0</ele>');
    expect(output).toContain('<time>2023-03-28T10:40:00.000Z</time>');
    expect(output).toContain('<gpxtpx:TrackPointExtension>');
    expect(output).toContain('<gpxtpx:hr>140</gpxtpx:hr>');
    expect(output).toContain('<gpxtpx:cad>80</gpxtpx:cad>');
    expect(output).toContain('<pwr:PowerInWatts>150</pwr:PowerInWatts>');
  });

  it('builds FIT output as a non-empty Uint8Array and contains the .FIT magic bytes', () => {
    const output = buildFIT(records);

    expect(output).toBeInstanceOf(Uint8Array);
    expect(output.length).toBeGreaterThan(0);
    expect(output[8]).toBe(0x2e);
    expect(output[9]).toBe(0x46);
    expect(output[10]).toBe(0x49);
    expect(output[11]).toBe(0x54);
  });

  describe('download helper', () => {
    let createObjectURL: ReturnType<typeof vi.spyOn>;
    let revokeObjectURL: ReturnType<typeof vi.spyOn>;
    let appendChild: ReturnType<typeof vi.spyOn>;
    let removeChild: ReturnType<typeof vi.spyOn>;
    let createElement: ReturnType<typeof vi.spyOn>;
    let anchor: { href: string; download: string; click: () => void };

    beforeEach(() => {
      anchor = { href: '', download: '', click: vi.fn() };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => anchor),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      } as unknown as Document);
      createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://test');
      revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      createElement = vi.spyOn(document, 'createElement');
      appendChild = vi.spyOn(document.body, 'appendChild');
      removeChild = vi.spyOn(document.body, 'removeChild');
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('creates an object URL, appends an anchor, triggers download click, and revokes the URL', () => {
      download('test-data', 'ride-export', 'application/gpx+xml');

      expect(createObjectURL).toHaveBeenCalled();
      expect(createElement).toHaveBeenCalledWith('a');
      expect(anchor.download).toBe('ride-export.gpx');
      expect(anchor.click).toHaveBeenCalled();
      expect(appendChild).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalled();

      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob://test');
    });
  });
});
