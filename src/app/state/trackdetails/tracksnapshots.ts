import { ChangeDetails, ChangeType, Snapshot } from '@/app/services/changehistory';
import { AudioTrackChangeDetails, AudioTrackDetails } from './trackdetails';
import { audioManager } from '@/app/services/audio/audiotrackmanager';
import { compareValues } from '@/app/services/noderegistry';

export function undoSnapshotChange(
  trackDetails: AudioTrackDetails[][],
  changeDetails: ChangeDetails<AudioTrackChangeDetails>[],
  redo = false
) {
  const tracksToAdd: AudioTrackDetails[][] = Array.from({ length: trackDetails.length }, () => []);
  const audioTracksToRemove: number[][] = Array.from({ length: trackDetails.length }, () => []);

  for (const changeDetail of changeDetails) {
    switch (changeDetail.changeType) {
      // Remove the values.
      case ChangeType.NewlyCreated: {
        const { trackNumber, audioId, trackDetail } = changeDetail.data;

        // Sorted for labelling.
        switch (redo) {
          // This is an undo operation.
          case false:
            const index = trackDetails[trackNumber].findIndex(trk => (
              trk.trackDetail.scheduledKey === trackDetail.scheduledKey
            ));
  
            if (index > -1) {
              const currentTrack = trackDetails[trackNumber][index];
              audioManager.removeTrackFromScheduledNodes(currentTrack);
              trackDetails[trackNumber].splice(index, 1);
            } else {
              console.error('Not consistent');
            }
            break;
          
          // This is a redo operation.
          default:
            const newData = {
              ...changeDetail.data,
              trackDetail: {
                ...changeDetail.data.trackDetail,
                id: -1
              }
            };
            tracksToAdd[trackNumber].push(newData);
            audioManager.scheduleSingleTrack(audioId, newData.trackDetail);
            break;
        }
        break;
      };

      // Add them back
      case ChangeType.Removed: {
        const {
          trackNumber,
          // audioIndex,
          ...rest
        } = changeDetail.data;

        switch (redo) {
          case false: 
            const newData = {
              ...rest,
              trackDetail: {
                ...rest.trackDetail,
                id: -1,
              }
            };
            tracksToAdd[trackNumber].push(newData);
            audioManager.scheduleSingleTrack(rest.audioId, newData.trackDetail);
            break;

          default:
            const index = trackDetails[trackNumber].findIndex(trk => (
              trk.trackDetail.scheduledKey === rest.trackDetail.scheduledKey
            ));
            if (index > -1) {
              const currentTrack = trackDetails[trackNumber][index];
              audioManager.removeTrackFromScheduledNodes(currentTrack);
              trackDetails[trackNumber].splice(index, 1);
            } else {
              console.error('Not consistent');
            }
            break;   
        }

        break;
      };

      // Change to previous
      case ChangeType.Updated: {
        const { trackNumber, ...rest } = !redo ? 
          changeDetail.data.previous :
          changeDetail.data.current;
        
        const index = trackDetails[trackNumber].findIndex(trk => (
          trk.trackDetail.scheduledKey === rest.trackDetail.scheduledKey
        ));

        if (index > -1) {
          const currentTrack = trackDetails[trackNumber][index];
          const {
            trackDetail: {
              scheduledKey
            }
          } = currentTrack;

          audioManager.rescheduleTrackFromScheduledNodes(scheduledKey, rest.trackDetail);
          trackDetails[trackNumber][index] = rest;
        } else {
          console.error('Not consistent');
        }

        break;
      }
    }
  }

  tracksToAdd.forEach((track, trackNumber) => {
    const audioIndexes = audioTracksToRemove[trackNumber];

    trackDetails[trackNumber] = trackDetails[trackNumber]
      .filter((_, index) => audioIndexes.indexOf(index) === -1)
      .concat(track)
      .sort((a, b) => a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros);
  });
}

/**
 * @description Compare snapshot with previous snapshot, used with change history
 * for storing changes between action..
 * @param snapshot captured snapshot,
 * @param trackDetails 
 */
export function compareSnapshots(
  snapshot: Snapshot<AudioTrackDetails[][]>, 
  trackDetails: AudioTrackDetails[][]
): Array<ChangeDetails<AudioTrackChangeDetails>> {
  const { state } = snapshot;
  const changedDetails: ChangeDetails<AudioTrackChangeDetails>[] = [];

  for (let trackIndex = 0; trackIndex < trackDetails.length; ++trackIndex) {
    const previousTrack = state[trackIndex];
    const currentTrack = trackDetails[trackIndex];

    // Get all unique keys
    const visitedScheduledTracks = currentTrack
      .map(track => track.trackDetail.scheduledKey)
      .concat(previousTrack.map(track => track.trackDetail.scheduledKey))
      .filter((trackKey, index, trackArray) => trackArray.indexOf(trackKey) === index);

    // Check if two keys are same.
    for (const key of visitedScheduledTracks) {
      const currentScheduledTrackIndex = currentTrack.findIndex(track => (
        track.trackDetail.scheduledKey === key
      ));
      const previousScheduledTrackIndex = previousTrack.findIndex(track => (
        track.trackDetail.scheduledKey === key
      ));

      if (currentScheduledTrackIndex > -1 && previousScheduledTrackIndex > -1) {
        // Perform action if both are not equal.
        // Add updated values to the track
        if (!compareValues(currentTrack[currentScheduledTrackIndex], previousTrack[previousScheduledTrackIndex])) {
          changedDetails.push({
            changeType: ChangeType.Updated,
            data: {
              previous: {
                ...previousTrack[previousScheduledTrackIndex],
                trackNumber: trackIndex,
              },
              current: {
                ...currentTrack[currentScheduledTrackIndex],
                trackNumber: trackIndex,
              }
            }
          });
        }
      } else if (currentScheduledTrackIndex > -1) {
        // Newly added
        changedDetails.push({
          changeType: ChangeType.NewlyCreated,
          data: {
            ...currentTrack[currentScheduledTrackIndex],
            trackNumber: trackIndex,
          }
        });
      } else {
        // This will always run, if nothing else.
        changedDetails.push({
          changeType: ChangeType.Removed,
          data: {
            ...previousTrack[previousScheduledTrackIndex],
            trackNumber: trackIndex,
          }
        });
      }
    }
  }

  return changedDetails;
}
