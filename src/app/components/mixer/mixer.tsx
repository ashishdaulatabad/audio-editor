import React from 'react';
import { MixerInput } from './mixerinput';
import { audioManager } from '@/app/services/audiotrackmanager';

export interface MixerProps {

}

export function MixerMaster(props: React.PropsWithoutRef<MixerProps>) {
  const totalMixers = audioManager.totalMixers;

  return (
    <>
      <div className="mixer-master mr-2 pr-2 border-r border-darker">
        <MixerInput
          mixerNumber={-1}
          master={true}
        />
      </div>
      <div className="mixer flex flex-row">
        {
          Array.from({length: totalMixers}, (_, index: number) => (
            <MixerInput
              mixerNumber={index}
              master={false}
              key={index}
            />
          ))
        }
      </div>
    </>
  );
}