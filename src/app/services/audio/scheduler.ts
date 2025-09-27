import {
  AudioTrackDetails, 
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails/trackdetails';
import {SubType} from './audiotrackmanager';
import {SingletonStore} from '../singlestore';
import {Mixer} from '../mixer';
import {AudioSyncClock} from './clock';
import {audioService} from '../audioservice';
import {AudioStore} from './audiobank';
import {ScheduledTrackAutomation} from '@/app/state/trackdetails/trackautomation';
import {getAudioNodeFromRegistry} from './noderegistry';

/**
 * @description Schedule Node Information related to the tracks.
 */
export type ScheduledNodesInformation = {
  [k: symbol]: {
    audioId: symbol
    buffer: AudioBufferSourceNode
    details: SubType<AudioTrackDetails, 'trackDetail'>
  }
};

type ScheduledAutomation = {
  [k: symbol]: ScheduledTrackAutomation
}

// TODO: Define scheduled queue for tracks and track automations
export class ScheduledQueue {
  private queue = [];

  constructor() {}
};

const scheduledQueue = new ScheduledQueue();

/**
 * @description General Scheduler for tracks.
 */
export class Scheduler {
  private scheduledAudioNodes: ScheduledNodesInformation = {};
  private scheduledAutomation: ScheduledAutomation = {};
  private mixer: Mixer = SingletonStore.getInstance(Mixer);
  private clock: AudioSyncClock = SingletonStore.getInstance(AudioSyncClock);
  private audioStore = SingletonStore.getInstance(AudioStore) as AudioStore;

  constructor() {}

  private _unscheduleAutomationInternal(nodeId: symbol) {
    if (Object.hasOwn(this.scheduledAutomation, nodeId)) {
      const node = getAudioNodeFromRegistry(nodeId);
      
      if (node === undefined) {
        return;
      }

      // get aparam
      const aParam = this.scheduledAutomation[nodeId].aParam;
      aParam.cancelScheduledValues(0);
      delete this.scheduledAutomation[nodeId];
    }
  }

  private _rescheduleAutomationInternal(automation: ScheduledTrackAutomation) {
    this._unscheduleAutomationInternal(automation.nodeId);
    this._scheduleAutomationInternal(automation);
  }

  private _scheduleAutomationInternal(automation: ScheduledTrackAutomation) {
    const seekbarOffsetInMicros = this.clock.getRunningTimestamp() * SEC_TO_MICROSEC;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const startTime = automation.startOffsetMicros;
    const endTime = automation.endOffsetMicros;
    const offsetMicros = automation.offsetMicros

    if (offsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = automation.nodeId;

      if (Object.hasOwn(this.scheduledAutomation, key)) {
        const node = getAudioNodeFromRegistry(key);
        // Deduce automation being performed on this node.
        if (node === undefined) {
          return;
        }

        const aParam = this.scheduledAutomation[key].aParam;
        aParam.cancelScheduledValues(0);
        delete this.scheduledAutomation[key];
      }

      return;
    }

    let index = 0;

    // Change strategy based on the total points 
    while (
      index < automation.points.length && 
      offsetMicros + automation.points[index].time < seekbarOffsetInMicros
    ) {
      ++index;
    }

    --index;

    // Currently assume that all points are linear
    // Get current value
    const currPoint = automation.points[index];
    const nextPoint = automation.points[index + 1];
    const proportion = (seekbarOffsetInMicros - currPoint.time) / (nextPoint.time - currPoint.time);
    const currentValue = (nextPoint.value - currPoint.value) * proportion + currPoint.value;

    const node = getAudioNodeFromRegistry(automation.nodeId);
    if (node === undefined) {
      return;
    }

    if (node instanceof GainNode) {
      const aParam = node.gain;
      aParam.setValueAtTime(currentValue, currentTime);

      for (let i = index + 1; i < automation.points.length; ++i) {
        const point = automation.points[i];
        const timeInSecs = (point.time - offsetMicros) / SEC_TO_MICROSEC;
        aParam.linearRampToValueAtTime(point.value, currentTime + timeInSecs);
      }
    }

    this.scheduledAutomation[automation.nodeId] = automation;
  }

  private _scheduleTrackInternal(
    audioId: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>
  ) {
    const seekbarOffsetInMicros = this.clock.getRunningTimestamp() * SEC_TO_MICROSEC;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const {
      scheduledKey,
      startOffsetInMicros,
      endOffsetInMicros,
      offsetInMicros: trackOffsetMicros
    } = trackDetail;

    // Not scaled with playback rate.
    const startTime = startOffsetInMicros;
    // Not scaled with playback rate.
    const endTime = endOffsetInMicros;

    if (trackOffsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = scheduledKey;

      if (Object.hasOwn(this.scheduledAudioNodes, key)) {
        this.scheduledAudioNodes[key].buffer.stop();
        delete this.scheduledAudioNodes[key];
      }
      return;
    }

    const startTimeSecs = startTime / SEC_TO_MICROSEC;
    const trackDurationSecs = endTime / SEC_TO_MICROSEC;
    const distance = seekbarOffsetInMicros - trackOffsetMicros;
    const startFrom = ((currentTime * SEC_TO_MICROSEC) + Math.max(-distance, 0)) / SEC_TO_MICROSEC;
    
    const bufferSource = context.createBufferSource();
    bufferSource.buffer = this.audioStore.getAudioBuffer(audioId);

    const {
      gain, 
      panner, 
      audioDetails: {
        mixerNumber
      }
    } = this.audioStore.audioBank[audioId];

    const destination = bufferSource.connect(gain).connect(panner);
    this.mixer.useMixer().connectNodeToMixer(destination, mixerNumber);

    const offsetStart = startTimeSecs + (Math.max(distance, 0)) / SEC_TO_MICROSEC;

    bufferSource.start(
      startFrom, 
      offsetStart,
      trackDurationSecs - offsetStart
    );
    this.scheduledAudioNodes[scheduledKey] = {
      audioId,
      buffer: bufferSource,
      details: trackDetail
    };

    bufferSource.onended = () => {};
  }
}

