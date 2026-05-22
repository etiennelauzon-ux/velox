import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAppStore } from '@/state/useAppStore';
import WorkoutBuilder from '@/ui/panels/WorkoutBuilder';
import { sendErg } from '@/bluetooth/bluetooth';
import { openSummary, startFtpRampTest, stopFtpRampTest } from '@/ui/features';
import { LiveShare } from '@/live/liveNetwork';
import { liveState } from '@/state/liveState';
import { rideState, setErgMode } from '@/state/rideState';
import { Store } from '@/state/store';
import { parseWorkoutFile } from '@/workout/workoutParsers';
import { setWorkoutPlan, workoutState } from '@/workout/workoutState';
import { getWorkoutProgress, startWorkout, stopWorkout } from '@/workout/workoutController';
import { drawWorkoutChart } from '@/ui/chart';
import { status } from '@/ui/domHelpers';
import type { WorkoutPlan } from '@/types';

type WorkoutProgressView = {
  stepRemain: string;
  totalRemain: string;
  stepLabel: string;
  totalPct: number;
};

export default function ControlsPanel() {
  const rider = useAppStore(state => state.rider);
  const trainer = useAppStore(state => state.trainer);
  const ui = useAppStore(state => state.ui);
  const setRider = useAppStore(state => state.setRider);
  const setTrainer = useAppStore(state => state.setTrainer);
  const setUi = useAppStore(state => state.setUi);
  const [ergOn, setErgOn] = useState(false);
  const [rampActive, setRampActive] = useState(false);
  const [joined, setJoined] = useState(liveState.joined);
  const [plan, setPlan] = useState<WorkoutPlan | null>(workoutState.plan);
  const [active, setActive] = useState(workoutState.active);
  const [progress, setProgress] = useState<WorkoutProgressView | null>(getProgressView);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) setUi({ liveRoom: room });
  }, [setUi]);

  useEffect(() => {
    const refresh = () => {
      setErgOn(rideState.erg);
      setJoined(liveState.joined);
      setPlan(workoutState.plan);
      setActive(workoutState.active);
      setProgress(getProgressView());
    };
    refresh();
    return Store.subscribe(refresh);
  }, []);

  useEffect(() => {
    drawWorkoutChart(plan);
  }, [plan]);

  const handleErgToggle = () => {
    const nextMode = !ergOn;
    setErgMode(nextMode, trainer.ergWatts);
    setErgOn(nextMode);
    if (nextMode) {
      void sendErg(trainer.ergWatts);
    }
  };

  const handleSummary = () => {
    openSummary();
  };

  const handleRampTest = () => {
    if (rampActive) {
      stopFtpRampTest();
    } else {
      startFtpRampTest();
    }
    setRampActive(active => !active);
  };

  const handleLiveToggle = () => {
    if (joined) {
      LiveShare.leave();
    } else {
      void LiveShare.join();
    }
  };

  const handleWorkoutLoad = (plan: WorkoutPlan) => {
    setWorkoutPlan(plan);
    setPlan(plan);
    setActive(false);
  };

  const loadWorkoutFile = async (file: File | null) => {
    if (!file) return;
    try {
      const nextPlan = parseWorkoutFile(await file.text(), file.name);
      setWorkoutPlan(nextPlan);
      setPlan(nextPlan);
      setActive(false);
      setProgress(getProgressView());
      status(`Workout loaded: ${nextPlan.name} - ${Math.round(nextPlan.totalSec / 60)} min`);
    } catch (error) {
      status('Workout error: ' + (error as Error).message);
    }
  };

  const handleWorkoutFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void loadWorkoutFile(e.target.files?.[0] ?? null);
    e.target.value = '';
  };

  const handleWorkoutDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    void loadWorkoutFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleWorkoutStart = () => {
    if (active) {
      stopWorkout();
      setActive(false);
      setProgress(getProgressView());
      return;
    }
    if (!plan) return;
    if (!ergOn) {
      setErgMode(true, trainer.ergWatts);
      setErgOn(true);
    }
    startWorkout();
    setActive(workoutState.active);
    setProgress(getProgressView());
  };

  return (
    <div className="panel side">
      <h2
        className={`collapsibleHeader${ui.controlsCollapsed ? ' collapsed' : ''}`}
        id="controlsToggle"
        onClick={() => setUi({ controlsCollapsed: !ui.controlsCollapsed })}
      >
        Controls
        <span className="collapseIcon">v</span>
      </h2>
      <div className={`body${ui.controlsCollapsed ? ' collapsed' : ''}`} id="controlsBody">
        <div className="form">
          <label>
            FTP watts <span className="optionalTag">optional</span>
            <input
              id="ftp"
              className="compactInput"
              type="number"
              min="0"
              max="500"
              placeholder="e.g. 250"
              value={rider.ftp || ''}
              onChange={e => setRider({ ftp: Number(e.target.value) || 0 })}
            />
          </label>

          <div className="hrModeBlock">
            <div className="hrModeLabel">HR zones <span className="optionalTag">optional</span></div>
            <div className="hrModeRadios">
              <label className="radioLabel">
                <input
                  type="radio"
                  name="hrMode"
                  id="hrModeNone"
                  value=""
                  checked={rider.hrMode === ''}
                  onChange={() => setRider({ hrMode: '' })}
                /> None
              </label>
              <label className="radioLabel">
                <input
                  type="radio"
                  name="hrMode"
                  id="hrModeLthr"
                  value="lthr"
                  checked={rider.hrMode === 'lthr'}
                  onChange={() => setRider({ hrMode: 'lthr' })}
                /> LTHR
              </label>
              <label className="radioLabel">
                <input
                  type="radio"
                  name="hrMode"
                  id="hrModeMaxhr"
                  value="maxhr"
                  checked={rider.hrMode === 'maxhr'}
                  onChange={() => setRider({ hrMode: 'maxhr' })}
                /> Max HR
              </label>
            </div>
            <div id="lthrRow" className={rider.hrMode === 'lthr' ? '' : 'hidden'}>
              <label>LTHR bpm
                <input
                  id="lthr"
                  className="compactInput"
                  type="number"
                  min="0"
                  max="220"
                  placeholder="e.g. 165"
                  value={rider.lthr || ''}
                  onChange={e => setRider({ lthr: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
            <div id="maxhrRow" className={rider.hrMode === 'maxhr' ? '' : 'hidden'}>
              <label>Max HR bpm
                <input
                  id="maxhr"
                  className="compactInput"
                  type="number"
                  min="0"
                  max="220"
                  placeholder="e.g. 190"
                  value={rider.maxhr || ''}
                  onChange={e => setRider({ maxhr: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          </div>

          <label>Rider weight kg
            <input
              id="riderWeight"
              className="compactInput"
              type="number"
              min="0"
              max="999"
              step="0.5"
              value={rider.riderWeightKg}
              onChange={e => setRider({ riderWeightKg: Number(e.target.value) || 72 })}
            />
          </label>
          <label>ERG target watts
            <input
              id="ergWatts"
              className="compactInput"
              type="number"
              min="0"
              max="500"
              value={trainer.ergWatts}
              onChange={e => setTrainer({ ergWatts: Number(e.target.value) || 200 })}
            />
          </label>
        </div>

        <div className="row inlineTop">
          <button id="ergToggle" type="button" className={ergOn ? 'active' : ''} onClick={handleErgToggle}>
            {ergOn ? 'ERG On' : 'ERG Off'}
          </button>
          <button id="summaryBtn" type="button" onClick={handleSummary}>Ride Summary</button>
          <button id="ftpRampBtn" type="button" onClick={handleRampTest}>
            {rampActive ? 'Stop FTP Ramp' : 'FTP Ramp Test'}
          </button>
        </div>

        <div className="body workoutBody">
          <WorkoutBuilder onLoad={handleWorkoutLoad} />
          <input id="workoutFile" type="file" accept=".erg,.mrc,.zwo" hidden onChange={handleWorkoutFileChange} />
          {!plan && (
            <div
              id="workoutDropZone"
              className={`workoutDrop${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleWorkoutDrop}
            >
              Drop workout file
            </div>
          )}
          {plan && (
            <div id="workoutLoaded">
              <div className="workoutHeader">
                <div className="workoutInfo">
                  <div className="workoutName" id="workoutName">{plan.name}</div>
                  <div className="workoutMeta" id="workoutMeta">{plan.steps.length} steps - {Math.round(plan.totalSec / 60)} min</div>
                </div>
                <button
                  type="button"
                  id="workoutStartBtn"
                  className={active ? 'danger' : ''}
                  onClick={handleWorkoutStart}
                >
                  {active ? 'Stop Workout' : 'Start Workout'}
                </button>
              </div>
              <canvas id="workoutChart" className="workoutChart"></canvas>
              {active && progress && (
                <div id="workoutProgressWrap" className="workoutProgressWrap">
                  <div className="workoutProgressTrack">
                    <div id="workoutProgressBar" className="workoutProgressBar" style={{ width: `${progress.totalPct}%` }}></div>
                  </div>
                </div>
              )}
              {active && progress && (
                <div id="workoutLive" className="workoutLive">
                  <Pill id="workoutStepRemain" value={progress.stepRemain} label="step remain" />
                  <Pill id="workoutTotalRemain" value={progress.totalRemain} label="total remain" />
                  <div className="pill wideSpan"><b id="workoutStepLabel">{progress.stepLabel}</b><span>current step</span></div>
                </div>
              )}
            </div>
          )}
          {plan && (
            <div
              id="workoutDropZone"
              className={`workoutDrop has-workout${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleWorkoutDrop}
            >
              Drop replacement workout
            </div>
          )}
        </div>

        <div className="form inlineTop">
          <label>Room ID
            <input
              id="liveRoom"
              className="compactInput"
              type="text"
              maxLength={32}
              placeholder="team-ride"
              value={ui.liveRoom}
              onChange={e => setUi({ liveRoom: e.target.value })}
            />
          </label>
          <label>Rider name
            <input
              id="liveName"
              className="compactInput"
              type="text"
              maxLength={32}
              placeholder="Rider"
              value={ui.liveName}
              onChange={e => setUi({ liveName: e.target.value })}
            />
          </label>
        </div>
        <div className="row inlineTop">
          <button id="liveRoomBtn" type="button" className={joined ? 'danger' : 'primary'} onClick={handleLiveToggle}>
            {joined ? 'Leave Room' : 'Join Room'}
          </button>
        </div>
        <p className="small liveTip">Share the same room name with friends to sync positions and telemetry in real time.</p>
        <div className="liveState">
          <i className="liveDot" id="liveDot"></i>
          <span id="liveStatus">Live sharing disconnected. Join a room to share.</span>
        </div>
        <div id="livePeers" className="livePeers"></div>
        <div className="log inlineTop" id="log"></div>
        <p className="small">Web Bluetooth works in Chrome or Edge on localhost/HTTPS. To ride a real course, export/download it as GPX or FIT and upload it here.</p>
      </div>
    </div>
  );
}

function Pill(props: { id: string; value: string; label: string }) {
  return (
    <div className="pill">
      <b id={props.id}>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}

const pad = (n: number): string => String(Math.floor(n)).padStart(2, '0');
const mmss = (s: number): string => `${pad(s / 60)}:${pad(s % 60)}`;

function getProgressView(): WorkoutProgressView | null {
  const progress = getWorkoutProgress();
  if (!progress) return null;
  return {
    stepRemain: mmss(progress.stepRemainingSec),
    totalRemain: mmss(Math.max(0, progress.totalSec - progress.totalElapsedSec)),
    stepLabel: progress.stepLabel,
    totalPct: Math.min(100, (progress.totalElapsedSec / Math.max(1, progress.totalSec)) * 100),
  };
}
