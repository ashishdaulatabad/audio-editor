import React from 'react';

/**
 * @description Props for displaying track information
 * @todo multiple things:
 * - Set recognizable audio level hint besides the knob
 * - Set probably the audio output.
 * - Think about effects on next stage.
 */
interface TrackInfoProps {
  /**
   * @description Id of this track.
   */
  id: number
  /**
   * @description Height set for this track.
   */
  height: number
}

export function TrackInfo(props: React.PropsWithoutRef<TrackInfoProps>) {
  return (
    <div className="inline-flex content-start">
      <span
        className="block text-lg select-none"
      >Track {props.id + 1}</span>
    </div>
  );
}
