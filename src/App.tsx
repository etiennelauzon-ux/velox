import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { ErrorTray } from '@/components/ErrorBoundary';
import RidePanel from '@/ui/panels/RidePanel';
import CoursePanel from '@/ui/panels/CoursePanel';
import ControlsPanel from '@/ui/panels/ControlsPanel';
import SummaryOverlay from '@/ui/panels/SummaryOverlay';
import { useAppStore } from '@/state/useAppStore';
import { buildGPX, buildFIT, download } from '@/export/export';
import { connectTrainer, connectHrm, startDemo, startRide, stopDemo, stopRide } from '@/bluetooth/bluetooth';
import recordingState from '@/state/recordingState';
import { rideState } from '@/state/rideState';
import { Store } from '@/state/store';
import { uploadCourse } from '@/route/routeController';

export function App() {
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);
  const courseFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const handleCourseFileChange = () => {
    void uploadCourse();
  };

  return (
    <>
      <main className="app" data-theme={theme}>
        <header className="top">
          <div className="brand">VEL<span>OX</span></div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="themeToggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
          <div className="dot" id="dot"></div>
          <div className="status" id="status" aria-live="polite">Ready</div>
          <div className="actions">
            <SensorsDropdown />
            <StartDropdown />
            <ImportDropdown courseFileRef={courseFileRef} />

            <div id="reactHeader" className="reactActions"></div>
            <ExportDropdown />
          </div>
        </header>

        <section className="grid">
          <RidePanel />
          <CoursePanel />
          <ControlsPanel />
        </section>
      </main>

      <SummaryOverlay />
      <ErrorTray />
      <input
        ref={courseFileRef}
        id="courseFile"
        type="file"
        accept=".gpx,.fit,application/gpx+xml,application/octet-stream"
        hidden
        onChange={handleCourseFileChange}
      />
      <div className="versionBadge">{__GIT_HASH__}</div>
    </>
  );
}

function SensorsDropdown() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpen(isOpen => !isOpen);
  };

  const handleTrainerConnect = () => {
    setOpen(false);
    void connectTrainer();
  };

  const handleHrmConnect = () => {
    setOpen(false);
    void connectHrm();
  };

  return (
    <div className={`dropdown${open ? ' open' : ''}`} id="sensorsDropdown">
      <button
        ref={btnRef}
        type="button"
        id="sensorsBtn"
        className="primary dropdown-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
      >
        Sensors <span className="dropArrow">v</span>
      </button>
      <div className={`dropMenu${open ? ' open' : ''}`} ref={menuRef} id="sensorsMenu" role="menu">
        <button type="button" id="trainerBtn" role="menuitem" onClick={handleTrainerConnect}>Trainer / Power</button>
        <button type="button" id="hrmBtn" role="menuitem" onClick={handleHrmConnect}>Heart Rate</button>
      </div>
    </div>
  );
}

function getStartLabel(): 'Start' | 'Stop Ride' | 'Stop Demo' {
  if (recordingState.recording) return 'Stop Ride';
  if (rideState.demo) return 'Stop Demo';
  return 'Start';
}

function StartDropdown() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<'Start' | 'Stop Ride' | 'Stop Demo'>(getStartLabel);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const refreshLabel = () => setLabel(getStartLabel());
    refreshLabel();
    return Store.subscribe(refreshLabel);
  }, []);

  const refreshLabel = () => setLabel(getStartLabel());

  const handleDemo = () => {
    setOpen(false);
    if (recordingState.recording) stopRide();
    if (!rideState.demo) startDemo();
    refreshLabel();
  };

  const handleRide = () => {
    setOpen(false);
    startRide();
    refreshLabel();
  };

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (recordingState.recording) {
      stopRide();
      refreshLabel();
      return;
    }
    if (rideState.demo) {
      stopDemo();
      refreshLabel();
      return;
    }
    setOpen(isOpen => !isOpen);
  };

  return (
    <div className={`dropdown${open ? ' open' : ''}`} id="startDropdown">
      <button
        ref={btnRef}
        type="button"
        id="startBtn"
        className={`primary dropdown-toggle${recordingState.recording ? ' danger' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
      >
        {label} <span className="dropArrow">v</span>
      </button>
      <div className={`dropMenu${open ? ' open' : ''}`} ref={menuRef} id="startMenu" role="menu">
        <button type="button" id="startDemoBtn" role="menuitem" onClick={handleDemo}>Demo</button>
        <button type="button" id="startRideBtn" role="menuitem" onClick={handleRide}>Ride</button>
      </div>
    </div>
  );
}

function ImportDropdown(props: {
  courseFileRef: RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpen(isOpen => !isOpen);
  };

  const handleCourse = () => {
    setOpen(false);
    props.courseFileRef.current?.click();
  };

  const handleWorkout = () => {
    setOpen(false);
    document.getElementById('workoutFile')?.click();
  };

  return (
    <div className={`dropdown${open ? ' open' : ''}`} id="importDropdown">
      <button
        ref={btnRef}
        type="button"
        id="importBtn"
        className="primary dropdown-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
      >
        Import <span className="dropArrow">v</span>
      </button>
      <div className={`dropMenu${open ? ' open' : ''}`} ref={menuRef} id="importMenu" role="menu">
        <button type="button" id="importCourseBtn" role="menuitem" onClick={handleCourse}>Course</button>
        <button type="button" id="importWorkoutBtn" role="menuitem" onClick={handleWorkout}>Workout</button>
      </div>
    </div>
  );
}

function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [hasRecords, setHasRecords] = useState(recordingState.records.length > 0);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const refresh = () => setHasRecords(recordingState.records.length > 0);
    refresh();
    return Store.subscribe(refresh);
  }, []);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (hasRecords) setOpen(isOpen => !isOpen);
  };

  const handleDownloadGPX = () => {
    setOpen(false);
    download(buildGPX(recordingState.records), 'velox-ride', 'application/gpx+xml');
  };

  const handleDownloadFIT = () => {
    setOpen(false);
    download(buildFIT(recordingState.records), 'velox-ride', 'application/octet-stream');
  };

  return (
    <div className={`dropdown${open ? ' open' : ''}`} id="downloadDropdown">
      <button
        ref={btnRef}
        type="button"
        id="downloadBtn"
        className="dropdown-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={!hasRecords}
        onClick={handleToggle}
      >
        Export <span className="dropArrow">v</span>
      </button>
      <div className={`dropMenu${open ? ' open' : ''}`} ref={menuRef} id="downloadMenu" role="menu">
        <button type="button" id="gpxBtn" role="menuitem" onClick={handleDownloadGPX} disabled={!hasRecords}>GPX</button>
        <button type="button" id="fitBtn" role="menuitem" onClick={handleDownloadFIT} disabled={!hasRecords}>FIT</button>
      </div>
    </div>
  );
}
