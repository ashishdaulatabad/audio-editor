import { AudioTrackDetails } from "@/app/state/trackdetails/trackdetails";
import { SubType } from "./audiotrackmanager";

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

const offlineScheduledNodes: ScheduledNodesInformation = {};

const scheduledNodes: ScheduledNodesInformation = {};

/**
 * @description Schedule the audio track for playback.
 * @param audioId - Unique identifier for the audio track.
 * @param trackDetail - Details of the audio track to be scheduled.
 */
function scheduleInternal(audioId: symbol, trackDetail: SubType<AudioTrackDetails, 'trackDetail'>) {

}
