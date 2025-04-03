import { RootState } from '@/app/state/store';
import React from 'react';
import { useSelector } from 'react-redux';

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
  const trackDetail = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.id]);

  return (
    <div className="inline-flex flex-col content-start">
      <span
        className="block text-lg select-none"
      >Track {props.id + 1}</span>
      <span className="block select-none">({trackDetail.length})</span>
    </div>
  );
}
