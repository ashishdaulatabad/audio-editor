import React from 'react';

/**
 * @description Props for displaying track information
 * @todo update:
 * - Allow addition/updation of name of this track.
 */
interface TrackInfoProps {
  /**
   * @description Id of this track.
   */
  id: number
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
