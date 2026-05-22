import { useEffect, useState } from 'react';
import { useAppStore } from '@/state/useAppStore';
import { Store } from '@/state/store';
import {
  clearToken,
  getTokenState,
  startOAuth,
  STRAVA_CONFIGURED,
} from '@/strava/stravaAuth';
import { loadStravaStarredSegments } from '@/route/segments';
import { loadPresetRoute, clearCourse } from '@/route/routeController';

export default function CoursePanel() {
  const ui = useAppStore(state => state.ui);
  const trainer = useAppStore(state => state.trainer);
  const setUi = useAppStore(state => state.setUi);
  const setTrainer = useAppStore(state => state.setTrainer);
  const [strava, setStrava] = useState(() => getStravaState());

  useEffect(() => {
    const refresh = () => setStrava(getStravaState());
    refresh();
    return Store.subscribe(refresh);
  }, []);

  const handleStravaConnect = () => {
    if (strava.connected) {
      clearToken();
      setStrava(getStravaState());
      Store.emit({ type: 'strava-auth' });
    } else {
      startOAuth();
    }
  };

  const stravaInfo = strava.connected
    ? (strava.athleteName ? `Connected as ${strava.athleteName}` : 'Connected')
    : strava.configured
      ? ''
      : 'Strava OAuth is not configured.';

  return (
    <div className="panel">
      <h2>
        Course
        <label className="streetviewToggle" title="Show Mapillary street-level imagery alongside the map">
          <input
            type="checkbox"
            id="streetviewToggle"
            checked={ui.streetviewEnabled}
            onChange={e => setUi({ streetviewEnabled: e.target.checked })}
          /> Street View
        </label>
      </h2>

      <div id="courseEmpty" className="courseEmpty">
        <div>
          <b>No course loaded</b>
          <span>Upload a GPX or FIT file to show the route map and move the rider marker with live speed.</span>
        </div>
      </div>
      <div id="map" className="hidden"></div>
      <div id="mlyWrap" className="hidden">
        <div className="mlyTop">
          <div><b>Street View</b> &middot; <span id="mlyStatus">Inactive</span></div>
          <div className="mlyControls">
            <input id="mlyToken" type="password" placeholder="Own token (optional)" autoComplete="off" title="Leave empty to use built-in service account" />
            <select
              id="mlyRefresh"
              title="Refresh rate"
              value={ui.mapillaryRefreshMs}
              onChange={e => setUi({ mapillaryRefreshMs: Number(e.target.value) || 2000 })}
            >
              <option value="1000">1s</option>
              <option value="2000">2s</option>
              <option value="3000">3s</option>
              <option value="5000">5s</option>
            </select>
            <select
              id="mlyRadius"
              title="Search radius"
              value={ui.mapillaryRadiusM}
              onChange={e => setUi({ mapillaryRadiusM: Number(e.target.value) || 60 })}
            >
              <option value="20">20m</option>
              <option value="40">40m</option>
              <option value="60">60m</option>
              <option value="80">80m</option>
              <option value="120">120m</option>
            </select>
          </div>
        </div>
        <div id="mly" className="mlyViewer"></div>
        <div id="mlyFallback" className="mlyFallback hidden">No nearby Mapillary image - showing OSM only.</div>
      </div>

      <div className="body">
        <div className="presetLine">
          <label>Preset Routes
            <select id="presetRoutes" className="compactInput" defaultValue="" onChange={() => void loadPresetRoute()}>
              <option value="">Select a preset route</option>
              <option value="CGV">CGV Route</option>
              <option value="Huez">Huez Route</option>
              <option value="ProTour">Pro Tour du Mont-Royal</option>
            </select>
          </label>
        </div>
        <div className="presetLine">
          <label>Map tiles
            <select id="tileSelector" className="compactInput" value={ui.mapTile} onChange={e => setUi({ mapTile: e.target.value || 'osm' })}>
              <option value="osm">Standard OSM</option>
              <option value="topo">Topographic (OpenTopoMap)</option>
              <option value="satellite">Satellite</option>
            </select>
          </label>
        </div>

        <div className="row inlineTop">
          <button id="clearLoopBtn" type="button" onClick={clearCourse}>Clear</button>
          <label className="tog">
            <input
              id="gradeToErg"
              type="checkbox"
              checked={trainer.gradeErg}
              onChange={e => setTrainer({ gradeErg: e.target.checked })}
            /> Grade controls trainer
          </label>
        </div>
        <div className="routeStats">
          <Pill id="lapDist" value="0.0" label="lap km" />
          <Pill id="lapElev" value="0" label="climb m" />
          <Pill id="gradeNow" value="0.0%" label="grade" />
          <Pill id="laps" value="0" label="laps" />
        </div>
        <canvas className="chart wide" id="elevationChart" title="Elevation profile"></canvas>
        <div className="routeStats">
          <Pill id="segmentTime" value="--:--" label="segment time" />
          <div className="pill spanThree"><b id="segmentName">No segment</b><span>active starred segment</span></div>
        </div>

        <div className="stravaRow">
          <button
            type="button"
            id="stravaConnectBtn"
            className={strava.connected ? 'danger' : 'primary'}
            disabled={!strava.configured && !strava.connected}
            title={!strava.configured && !strava.connected ? 'Strava OAuth is not configured' : ''}
            onClick={handleStravaConnect}
          >
            {strava.connected ? 'Disconnect' : 'Connect Strava'}
          </button>
          <button
            type="button"
            id="stravaSegmentsBtn"
            disabled={!strava.connected}
            onClick={() => void loadStravaStarredSegments()}
          >
            Starred Segments
          </button>
        </div>
        <div className="stravaInfo small" id="stravaInfo">{stravaInfo}</div>
        <div id="stravaSegments" className="segmentList"></div>
        <p className="small noBottom" id="courseNote">Upload a GPX/FIT course to ride the real track.</p>
      </div>
    </div>
  );
}

function getStravaState() {
  const tokenState = getTokenState();
  return {
    connected: Boolean(tokenState.accessToken),
    athleteName: tokenState.athleteName ?? '',
    configured: STRAVA_CONFIGURED,
  };
}

function Pill(props: { id: string; value: string; label: string }) {
  return (
    <div className="pill">
      <b id={props.id}>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}
