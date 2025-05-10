export interface TrackAutomationPoint {
  time: number
  value: number
}

export interface TrackAutomation {
  nodeId: symbol
  offsetMicros: number
  startOffsetMicros: number
  endOffsetMicros: number
  points: Array<TrackAutomationPoint>
}

export function TrackAutomation(props: React.PropsWithoutRef<TrackAutomation>) {
  return (
    <>
    </>
  )
}