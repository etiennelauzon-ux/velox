import { useAppStore } from '@/state/useAppStore';

export default function RidePanel() {
  return (
    <div className="panel">
      <h2>Ride</h2>
      <div className="body">
        <div className="power" id="powerPanel">
          <div>
            <div className="watts" id="power">0</div>
            <div className="unit">watts</div>
            <div className="zone" id="zone">Z1 Recovery</div>
            <div className="bar"><i id="zoneBar"></i></div>
          </div>
        </div>
        <div className="metrics">
          <Metric id="cadence" value="0" label="cadence rpm" />
          <Metric id="speed" value="0.0" label="speed km/h" />
          <Metric id="hr" value="--" label="heart rate bpm" />
          <Metric id="hrZone" value="--" label="hr zone" className="metric" wrapperId="hrZoneMetric" />
          <Metric id="time" value="00:00" label="elapsed" />
          <Metric id="distance" value="0.00" label="distance km" />
          <Metric id="avgPower" value="0" label="average watts" />
          <Metric id="calories" value="0" label="kcal" />
          <canvas className="chart wide" id="chart"></canvas>
          <canvas className="chart wide" id="pdcChart" title="Power duration curve"></canvas>
        </div>
      </div>
    </div>
  );
}

function Metric(props: { id: string; value: string; label: string; className?: string; wrapperId?: string }) {
  const hrMode = useAppStore(state => state.rider.hrMode);
  const isHrZone = props.wrapperId === 'hrZoneMetric';
  return (
    <div className={`${props.className ?? 'metric'}${isHrZone && !hrMode ? ' hidden' : ''}`} id={props.wrapperId}>
      <b id={props.id}>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}
