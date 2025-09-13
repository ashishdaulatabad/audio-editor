import {ChangeDetails} from '@/app/services/changehistory';

export interface TrackAutomationPoint {
  time: number
  value: number
}

export interface ScheduledTrackAutomation {
  nodeId: symbol
  selected: boolean
  colorAnnotation: string
  offsetMicros: number
  startOffsetMicros: number
  endOffsetMicros: number
  automationKey: string
  points: Array<TrackAutomationPoint>
}

export type TrackAutomationChangeDetails = ScheduledTrackAutomation & {
  trackNumber: number
}

export function undoAutomationSnapshotChange(
  snapshotChange: ScheduledTrackAutomation[][],
  changeDetails: ChangeDetails<TrackAutomationChangeDetails>[]
) {

}
