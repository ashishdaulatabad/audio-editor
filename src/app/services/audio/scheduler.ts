import {AudioTrackDetails} from "@/app/state/trackdetails/trackdetails";
import {SubType} from "./audiotrackmanager";

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

// TODO: Define scheduler for automation type.
/**
 * @description General Scheduler for tracks.
 */
export class Scheduler {
  private scheduledAudioNodes: ScheduledNodesInformation = {};
  private scheduledAutomations = {};

  constructor() {}

  private _scheduleTrackInternal(
    audioId: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>
  ) {

  }
}

