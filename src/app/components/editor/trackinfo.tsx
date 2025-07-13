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
  const trackDetail = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails[props.id]
  ));
  const [toggle, setToggle] = React.useState(true);

  // function toggleActiveTracks(toggle: boolean) {
  //   if (!toggle) {
  //     audioManager.removeScheduledTracksFromScheduledKeys(trackDetail.map((track) => track.trackDetail.scheduledKey));
  //   } else {
  //     for (const track of trackDetail) {
  //       audioManager.scheduleSingleTrack(track.audioId, track.trackDetail);
  //     }
  //   }
  //   setToggle(toggle)
  // }

  return (
    <div className="flex flex-row justify-center">
      <span
        className="block text-lg select-none"
      >Track {props.id + 1}</span>
      <span className="ml-2 text-lg select-none">({trackDetail.length})</span>
      <div className="ml-4 align-center items-center flex">
        {/* <Checkbox 
          label=""
          checked={toggle}
          onChange={toggleActiveTracks}
        /> */}
      </div>
    </div>
  );
}
