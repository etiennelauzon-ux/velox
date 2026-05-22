import { appStoreApi } from '@/state/useAppStore';
import { rideState } from '@/state/rideState';
import recordingState from '@/state/recordingState';
import { setNum, getEl } from '@/ui/domHelpers';
import { powerZone, hrZone, fmtTime } from '@/physics/physicsEngine';
import { updateSegmentReadout } from '@/route/segments';
import { updateRouteReadout } from '@/route/routeRenderer';
import { drawChart, drawElevationAndPdc } from '@/ui/chart';
import { renderSummary } from '@/ui/features';

export function updateUINow(): void {
  const rider = appStoreApi.getState().rider;
  const zone = powerZone(rideState.power, rider.ftp);
  const panel = getEl('powerPanel');
  if (panel) panel.style.setProperty('--zone', zone[1]);

  setNum('power', Math.round(rideState.power));
  setNum('cadence', Math.round(rideState.cadence) || 0);
  setNum('speed', rideState.speed.toFixed(1));
  setNum('hr', rideState.hr ? String(Math.round(rideState.hr)) : '--');
  setNum('hrZone', hrZone(rideState.hr, rider.hrMode, rider.lthr, rider.maxhr));
  setNum('distance', (rideState.distance / 1000).toFixed(2));
  setNum('calories', Math.round(rideState.calories));
  setNum('time', fmtTime(recordingState.elapsed));

  const zoneEl = getEl('zone');
  const barEl = getEl('zoneBar');
  const hasFtp = appStoreApi.getState().rider.ftp > 0;
  if (zoneEl) zoneEl.style.display = hasFtp ? '' : 'none';
  if (barEl) (barEl as HTMLElement).style.width = hasFtp ? Math.min(zone[2], 100) + '%' : '0%';
  if (hasFtp) setNum('zone', zone[0]);

  const avgPower = recordingState.records.length
    ? Math.round(recordingState.records.reduce((sum, r) => sum + r.power, 0) / recordingState.records.length)
    : 0;
  setNum('avgPower', avgPower);

  updateSegmentReadout();
  updateRouteReadout();
  drawChart();
  drawElevationAndPdc();
  renderSummary();
}
