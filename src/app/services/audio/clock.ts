import {TimeSectionSelection} from '@/app/components/editor/seekbar';
import {audioService} from '../audioservice';
import {Maybe} from '../interfaces';
import {SEC_TO_MICROSEC} from '@/app/state/trackdetails/trackdetails';

const DEFAULT_MIN_TIME_LOOP_SEC = 5;

export class AudioSyncClock  {
  timestamp = 0;
  startTimestamp = 0;
  runningTimestamp = 0;
  loopEnd = DEFAULT_MIN_TIME_LOOP_SEC;
  timeframeSelectionDetails = null as Maybe<TimeSectionSelection>;

  setLoopEnd(loopEnd: number) {
    this.loopEnd = loopEnd;
  }

  getRunningTimestamp() {
    return this.runningTimestamp;
  }
  // TODO: Set private
  _updateTimestampOnSelectedTimeframe() {
    const {
      startTimeMicros,
      endTimeMicros
    } = this.timeframeSelectionDetails as TimeSectionSelection;

    const startTimeSecs = startTimeMicros / SEC_TO_MICROSEC;
    const endTimeSecs = endTimeMicros / SEC_TO_MICROSEC;

    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (time - this.startTimestamp >= endTimeSecs) {
      // Correct the difference and add to the start timestamp.
      const diffCorrection = time - this.startTimestamp - endTimeSecs;
      this.startTimestamp = time - startTimeSecs;
      this.runningTimestamp = time - this.startTimestamp + diffCorrection;
      return true;
    } else {
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }
  // TODO: Set private
  _setTimestampOnSelectedTimeframe(valueSecs: number) {
    const {
      startTimeMicros,
      endTimeMicros
    } = this.timeframeSelectionDetails as TimeSectionSelection;

    const startTimeSecs = startTimeMicros / SEC_TO_MICROSEC;
    const endTimeSecs = endTimeMicros / SEC_TO_MICROSEC;

    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (valueSecs > endTimeSecs) {
      this.startTimestamp = time - startTimeSecs;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.startTimestamp = time - valueSecs;
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }
  setTimestamp(startValue: number) {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (this.timeframeSelectionDetails) {
      return this._setTimestampOnSelectedTimeframe(startValue);
    }

    if (startValue > this.loopEnd) {
      let diff = this.loopEnd - startValue;

      if (diff < 0 || diff > this.loopEnd) {
        const multiplier = Math.floor(Math.abs(diff) / this.loopEnd);
        diff = Math.abs(diff) - multiplier * this.loopEnd;
      }

      this.startTimestamp = time - diff;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.startTimestamp = time - startValue;
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }
  updateTimestamp() {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (this.timeframeSelectionDetails) {
      return this._updateTimestampOnSelectedTimeframe()
    }

    if (time - this.startTimestamp > this.loopEnd) {
      let diff = time - this.startTimestamp - this.loopEnd;

      if (diff > this.loopEnd) {
        const multiplier = Math.floor(Math.abs(diff) / this.loopEnd);
        diff = Math.abs(diff) - multiplier * this.loopEnd;
      }

      this.startTimestamp = time - diff;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }
}
