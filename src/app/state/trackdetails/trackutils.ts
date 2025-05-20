import { AudioTrackDetails } from '@/app/state/trackdetails/trackdetails';
import { ScheduledTrackAutomation } from './trackautomation';

export function getMaxTimeOverall(trackDetails: AudioTrackDetails[][], trackAutomation: ScheduledTrackAutomation[][]): number {
  return Math.max(getMaxTimeTracks(trackDetails), getMaxTimeAutomation(trackAutomation));
}

function getMaxTimeAutomation(trackAutomations: ScheduledTrackAutomation[][]): number {
  return trackAutomations.reduce((maxTime: number, currentArray) => {
    const maxTimeInCurrentTrack = currentArray.reduce((maxTime: number, trackAutomation) => {
      // Should always exist in microseconds
      const startTimeOfTrack = trackAutomation.startOffsetMicros;
      const endTimeOfTrack = trackAutomation.endOffsetMicros;

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = trackAutomation.offsetMicros + trackTotalTime;
      return Math.max(maxTime, endTime);
    }, 0)

    return Math.max(maxTime, maxTimeInCurrentTrack);
  }, 0);
}

function getMaxTimeTracks(trackDetails: AudioTrackDetails[][]) {
  return trackDetails.reduce((maxTime: number, currentArray) => {
    const maxTimeInCurrentTrack = currentArray.reduce((maxTime: number, currentTrack) => {
      // Should always exist in microseconds
      const startTimeOfTrack = currentTrack.trackDetail.startOffsetInMicros;
      const endTimeOfTrack = currentTrack.trackDetail.endOffsetInMicros;

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = currentTrack.trackDetail.offsetInMicros + trackTotalTime;
      return Math.max(maxTime, endTime);
    }, 0)

    return Math.max(maxTime, maxTimeInCurrentTrack);
  }, 0);
}
