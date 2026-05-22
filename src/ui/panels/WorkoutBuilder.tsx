import { useState } from 'react';
import type { WorkoutPlan } from '@/types';
import { parseWorkoutFile } from '@/workout/workoutParsers';
import { status } from '@/ui/domHelpers';

type Interval = {
  workMin: number;
  workPct: number;
  restMin: number;
  restPct: number;
};

const defaultInterval: Interval = {
  workMin: 1,
  workPct: 1,
  restMin: 2,
  restPct: 0.5,
};

const formatPct = (value: number): string => `${value}`;

type WorkoutBuilderProps = {
  onLoad: (plan: WorkoutPlan) => void;
};

function buildZwoXml(
  warmupMin: number,
  warmupPct: number,
  intervals: Interval[],
  cooldownMin: number,
  cooldownPct: number,
): string {
  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<workout>',
    '<name>Custom Workout</name>',
    '<description>Built from Workout Builder</description>',
  ];

  if (warmupMin > 0) {
    parts.push(
      `<Warmup Duration="${Math.round(warmupMin * 60)}" PowerLow="${formatPct(warmupPct)}" PowerHigh="${formatPct(warmupPct)}" />`,
    );
  }

  intervals.forEach(interval => {
    if (interval.workMin <= 0 || interval.restMin <= 0) return;
    parts.push(
      `<IntervalsT Repeat="1" OnDuration="${Math.round(interval.workMin * 60)}" OffDuration="${Math.round(interval.restMin * 60)}" OnPower="${formatPct(interval.workPct)}" OffPower="${formatPct(interval.restPct)}" />`,
    );
  });

  if (cooldownMin > 0) {
    parts.push(
      `<Cooldown Duration="${Math.round(cooldownMin * 60)}" PowerLow="${formatPct(cooldownPct)}" PowerHigh="${formatPct(cooldownPct)}" />`,
    );
  }

  parts.push('</workout>');
  return parts.join('');
}

export default function WorkoutBuilder(props: WorkoutBuilderProps) {
  const [warmupMin, setWarmupMin] = useState(10);
  const [warmupPct, setWarmupPct] = useState(0.5);
  const [intervals, setIntervals] = useState<Interval[]>([{ ...defaultInterval }]);
  const [cooldownMin, setCooldownMin] = useState(10);
  const [cooldownPct, setCooldownPct] = useState(0.5);
  const [loading, setLoading] = useState(false);

  const addInterval = () => setIntervals(prev => [...prev, { ...defaultInterval }]);
  const removeInterval = (index: number) => setIntervals(prev => prev.filter((_, idx) => idx !== index));

  const updateInterval = (index: number, field: keyof Interval, value: number) => {
    setIntervals(prev => prev.map((interval, idx) => idx === index ? { ...interval, [field]: value } : interval));
  };

  const handleLoadWorkout = async () => {
    setLoading(true);
    try {
      const xml = buildZwoXml(warmupMin, warmupPct, intervals, cooldownMin, cooldownPct);
      const plan = parseWorkoutFile(xml, 'custom.zwo');
      props.onLoad(plan);
      status(`Custom workout loaded: ${plan.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status(`Workout builder error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalMin = Math.round(
    warmupMin + cooldownMin + intervals.reduce((sum, interval) => sum + interval.workMin + interval.restMin, 0),
  );

  return (
    <div className="workoutBuilder">
      <h3>Workout Builder</h3>
      <div className="form">
        <label>
          Warmup (min)
          <input
            type="number"
            min={0}
            step={1}
            value={warmupMin}
            onChange={e => setWarmupMin(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label>
          Warmup power (% FTP)
          <input
            type="number"
            min={0}
            step={0.05}
            value={warmupPct}
            onChange={e => setWarmupPct(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>

      <div className="workoutIntervals">
        <div className="workoutGridHeader">
          <span>Work</span>
          <span>Power</span>
          <span>Rest</span>
          <span>Power</span>
          <span></span>
        </div>
        {intervals.map((interval, index) => (
          <div className="workoutIntervalRow" key={index}>
            <input
              type="number"
              min={0}
              step={1}
              value={interval.workMin}
              aria-label={`Interval ${index + 1} work duration`}
              onChange={e => updateInterval(index, 'workMin', Math.max(0, Number(e.target.value) || 0))}
            />
            <input
              type="number"
              min={0}
              step={0.05}
              value={interval.workPct}
              aria-label={`Interval ${index + 1} work power`}
              onChange={e => updateInterval(index, 'workPct', Math.max(0, Number(e.target.value) || 0))}
            />
            <input
              type="number"
              min={0}
              step={1}
              value={interval.restMin}
              aria-label={`Interval ${index + 1} rest duration`}
              onChange={e => updateInterval(index, 'restMin', Math.max(0, Number(e.target.value) || 0))}
            />
            <input
              type="number"
              min={0}
              step={0.05}
              value={interval.restPct}
              aria-label={`Interval ${index + 1} rest power`}
              onChange={e => updateInterval(index, 'restPct', Math.max(0, Number(e.target.value) || 0))}
            />
            <button type="button" onClick={() => removeInterval(index)} disabled={intervals.length === 1}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="primary" onClick={addInterval}>
          Add interval
        </button>
      </div>

      <div className="form">
        <label>
          Cooldown (min)
          <input
            type="number"
            min={0}
            step={1}
            value={cooldownMin}
            onChange={e => setCooldownMin(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label>
          Cooldown power (% FTP)
          <input
            type="number"
            min={0}
            step={0.05}
            value={cooldownPct}
            onChange={e => setCooldownPct(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>

      <div className="row inlineTop">
        <div className="small">Estimated total: {totalMin} min - {intervals.length} interval{intervals.length === 1 ? '' : 's'}</div>
        <button type="button" className="primary" onClick={handleLoadWorkout} disabled={loading}>
          {loading ? 'Loading...' : 'Load workout'}
        </button>
      </div>
    </div>
  );
}
