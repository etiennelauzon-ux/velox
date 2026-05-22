export default function SummaryOverlay() {
  return (
    <div id="summaryOverlay" className="overlay hidden">
      <div className="overlayPanel">
        <div className="overlayHeader">
          <h3>Ride Summary</h3>
          <button id="closeSummaryBtn" aria-label="Close summary">&times;</button>
        </div>
        <div className="summaryGrid">
          <SummaryBox id="summaryDuration" value="00:00" label="duration" />
          <SummaryBox id="summaryDistance" value="0.00 km" label="distance" />
          <SummaryBox id="summaryAvgPower" value="0 W" label="average power" />
          <SummaryBox id="summaryMaxPower" value="0 W" label="max power" />
          <SummaryBox id="summaryClimb" value="0 m" label="total climb" />
          <SummaryBox id="summaryAvgHr" value="-- bpm" label="average HR" />
        </div>
        <canvas className="summaryChart" id="summaryPdcChart"></canvas>
      </div>
    </div>
  );
}

function SummaryBox(props: { id: string; value: string; label: string }) {
  return (
    <div className="summaryBox">
      <b id={props.id}>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}
