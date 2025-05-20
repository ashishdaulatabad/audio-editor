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
  points: Array<TrackAutomationPoint>
}
