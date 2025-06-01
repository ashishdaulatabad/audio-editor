import { SlicerSelection } from '@/app/components/editor/slicer';
import { AudioTrackDetails, SEC_TO_MICROSEC } from './trackdetails';
import { audioManager } from '@/app/services/audio/audiotrackmanager';

export function addNewAudioToTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    track: AudioTrackDetails
  }
): AudioTrackDetails[][] {
  const { track, trackNumber } = action;
  trackDetails[trackNumber].push(track);
  // Probably sort array based on the appearance of each scheduled track?
  // This enable a domino-effect, making user's life easier to pull
  // out overlapping tracks.
  trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
    a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  ));

  return trackDetails;
}

export function markSelectionForAllAudioTracks(
  trackDetails: AudioTrackDetails[][],
  markAs: boolean
) {
  for (let index = 0; index < trackDetails.length; ++index) {
    for (const track of trackDetails[index]) {
      track.trackDetail.selected = markAs;
    }
  }
}

/**
 * @description Adds a single track, assumption that the user will 
 * place this track after the clone, then sorting can be done after
 * releasing the trigger
 * 
 * @param trackDetails 
 */
export function cloneSingleAudioTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    audioIndex: number
  }
): AudioTrackDetails[][] {
  const { trackNumber, audioIndex } = action;
  const track = trackDetails[trackNumber][audioIndex];

  const clonedDetails: AudioTrackDetails = {
    ...track,
    trackDetail: {
      ...track.trackDetail,
      scheduledKey: Symbol(),
      id: -1,
    }
  };

  clonedDetails.trackDetail.selected = false;

  // Todo: Check adding immediately near the specified position, at the start or 
  // at the end, need to create a domino effect while scheduling track.
  trackDetails[trackNumber].push(clonedDetails);
  trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
    a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  ));

  return trackDetails;
}

/**
 * @description Adds multiple tracks, assumption that the user will 
 * place this track after the clone, then sorting can be done after
 * releasing the trigger
 * 
 * @param trackDetails 
 */
export function cloneMultipleAudioTracks(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumbers: number[],
    audioIndexes: number[]
  }
): AudioTrackDetails[][] {
  const {
    trackNumbers,
    audioIndexes
  } = action;

  console.assert(
    trackNumbers.length === audioIndexes.length,
    'Something went wrong with cloning multiple tracks: missing Track/Audio details.'
  );

  trackNumbers.forEach((trackNumber, index: number) => {
    const audioIndex = audioIndexes[index];
    const track = trackDetails[trackNumber][audioIndex];

    const clonedDetails: AudioTrackDetails = {
      ...track,
      trackDetail: {
        ...track.trackDetail,
        // New cloned data: so new scheduled data.
        scheduledKey: Symbol(),
        id: -1,
      }
    };
    clonedDetails.trackDetail.selected = false;

    trackDetails[trackNumber].push(clonedDetails);
  });

  return trackDetails;
}

export function deleteSingleAudioTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    audioIndex: number
  }
) {
  const {
    trackNumber,
    audioIndex
  } = action;

  trackDetails[trackNumber].splice(audioIndex, 1);
  return trackDetails;
}

export function bulkDeleteTracks(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumbers: number[],
    audioIndexes: number[]
  }
): AudioTrackDetails[][] {
  const {
    trackNumbers,
    audioIndexes
  } = action;

  console.assert(
    trackNumbers.length === audioIndexes.length,
    'Something went wrong with deleting multiple tracks: missing Track/Audio details.'
  );

  trackNumbers.forEach((trackNumber, index: number) => {
    const includedTracks: AudioTrackDetails[] = [], excludedTracks: AudioTrackDetails[] = [];

    trackDetails[trackNumber].forEach((track, audioIndex) => {
      if (!audioIndexes.includes(audioIndex)) {
        includedTracks.push(track)
      } else {
        excludedTracks.push(track);
      }
    });

    trackDetails[trackNumber] = includedTracks;
  });

  return trackDetails;
}

export function sliceAudioTracksAtPoint(
  trackDetails: AudioTrackDetails[][],
  slicerSelection: SlicerSelection
) {
  const { 
    startTrack,
    endTrack,
    pointOfSliceSecs
  }= slicerSelection;
  const slicesToReschedule = [];
  
  for (let trackIndex = startTrack; trackIndex <= endTrack; ++trackIndex) {
    let audioTracks = trackDetails[trackIndex];
    const pendingTracksToAppend: AudioTrackDetails[] = [];

    for (let audioIndex = 0; audioIndex < audioTracks.length; ++audioIndex) {
      const audio = audioTracks[audioIndex];
      const offsetInMicros = audio.trackDetail.offsetInMicros;
      const offsetInSecs = offsetInMicros / SEC_TO_MICROSEC;
      const oldStartOffset = audio.trackDetail.startOffsetInMicros;
      const oldEndOffset = audio.trackDetail.endOffsetInMicros;
      const oldEndDuration = oldEndOffset - oldStartOffset;
      const endOffsetSecs = (offsetInMicros + oldEndDuration) / SEC_TO_MICROSEC;

      /// Check if intersects.
      if (endOffsetSecs > pointOfSliceSecs && pointOfSliceSecs > offsetInSecs) {
        const newEndPoint = (pointOfSliceSecs * SEC_TO_MICROSEC);
        const firstEndDuration = (newEndPoint - offsetInMicros);

        const firstHalf: AudioTrackDetails = {
          ...audio,
          trackDetail: {
            ...audio.trackDetail,
            endOffsetInMicros: oldStartOffset + firstEndDuration
          }
        }

        // Creating a new track
        const secondHalf: AudioTrackDetails = {
          ...audio,
          trackDetail: {
            ...audio.trackDetail,
            scheduledKey: Symbol(),
            offsetInMicros: newEndPoint,
            startOffsetInMicros: oldStartOffset + firstEndDuration,
            id: -1
          }
        };

        audioTracks[audioIndex] = firstHalf;
        pendingTracksToAppend.push(secondHalf);
        slicesToReschedule.push(firstHalf, secondHalf);
      }
    }

    for (const pendingTrack of pendingTracksToAppend) {
      audioTracks.push(pendingTrack);
    }

    if (pendingTracksToAppend.length > 0) {
      audioTracks = audioTracks.sort((first, second) => (
        first.trackDetail.offsetInMicros - second.trackDetail.offsetInMicros
      ));
    }
  }

  audioManager.rescheduleAllTracks(trackDetails, slicesToReschedule);

  return trackDetails;
}

export function setTrackOffsetToAFinalPoint(
  trackDetails: AudioTrackDetails[][],
  trackChangeDetails: {
    trackNumber: number
    audioIndex: number
    startOffsetInMicros: number
    endOffsetInMicros: number
    offsetInMicros: number
  }
) {
  const {
    trackNumber,
    audioIndex,
    offsetInMicros,
    startOffsetInMicros,
    endOffsetInMicros
  } = trackChangeDetails;

  trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
  trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;
  trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;

  trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
    a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  ));

  return trackDetails;
}

export function setMultipleOffsets(
  trackDetails: AudioTrackDetails[][],
  tracksChangeDetails: {
    allTrackNumbers: number[],
    allAudioIndexes: number[],
    allOffsetsInMicros: number[],
    allStartOffsetsInMicros: number[],
    allEndOffsetsInMicros: number[]
  }
) {
  const {
    allTrackNumbers,
    allAudioIndexes,
    allOffsetsInMicros,
    allStartOffsetsInMicros,
    allEndOffsetsInMicros
  } = tracksChangeDetails;

  if (
    allAudioIndexes.length !== allTrackNumbers.length ||
    allAudioIndexes.length !== allOffsetsInMicros.length ||
    allAudioIndexes.length !== allStartOffsetsInMicros.length ||
    allAudioIndexes.length !== allEndOffsetsInMicros.length
  ) {
    return trackDetails;
  }

  for (let index = 0; index < allTrackNumbers.length; ++index) {
    const trackNumber = allTrackNumbers[index];
    const audioIndex = allAudioIndexes[index];
    const offsetInMicros = allOffsetsInMicros[index];
    const startOffsetInMicros = allStartOffsetsInMicros[index];
    const endOffsetInMicros = allEndOffsetsInMicros[index];

    trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
    trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;
    trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;
  }

  const uniqueTrackNumbers = [...new Set(allTrackNumbers)];
  uniqueTrackNumbers.forEach(trackNumber => {
    trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
      a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
    ));
  });

  return trackDetails;
}

export function removeAudioFromAllScheduledTrack(
  trackDetails: AudioTrackDetails[][],
  audioId: symbol,
) {
  /// Filter all the tracks that contains this Audio
  for (let index = 0; index < trackDetails.length; ++index) {
    trackDetails[index] = trackDetails[index].filter(detail => detail.audioId !== audioId);
  }

  return trackDetails;
}
