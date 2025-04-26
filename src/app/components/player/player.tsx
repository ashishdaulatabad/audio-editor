import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { audioManager } from '@/app/services/audiotrackmanager';
import { RootState } from '@/app/state/store';
import { Status, togglePlay } from '@/app/state/trackdetails/trackdetails';
import { Pause } from '@/assets/pause';
import { Play } from '@/assets/play';
import { VolumeLevels } from './volumelevels';
import { Knob } from '../knob';
import { addIntoAudioBank } from '@/app/state/audiostate';
import { getRandomWindowId, randomColor } from '@/app/services/random';
import { addWindowToAction, VerticalAlignment } from '@/app/state/windowstore';
import { MixerMaster } from '../mixer/mixer';
import { Mixer } from '@/assets/mixer';
import { animationBatcher } from '@/app/services/animationbatch';
import { SimpleDropdown } from '../shared/dropdown/dropdown';

export enum TimeframeMode {
  Time,
  Beat
}

export function Timer() {
  const [timer, setTimer] = React.useState('00:00');
  const ref = React.createRef<HTMLDivElement>();
  
  React.useEffect(() => {
    let intervalId: symbol | null = null;
    intervalId = animationBatcher.addAnimationHandler(animateTimer);

    function animateTimer() {
      const currentTime = audioManager.getTimestamp();
      const minutes = Math.floor(currentTime / 60);
      const seconds = Math.floor(currentTime - minutes * 60);
      setTimer(`${(minutes < 10 ? '0' : '') + minutes}:${(seconds < 10 ? '0' : '') + seconds}`);
    }

    animationBatcher.setAnimationFrame(intervalId, 60);

    return () => {
      animationBatcher.removeAnimationHandler(intervalId);
    }
  });

  return (
    <div
      className="timer bg-secondary text-2xl text-pretty p-2 rounded-md min-w-28 text-center select-none"
      ref={ref}
    >
      {timer}
    </div>
  )
}

export function Player() {
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);
  const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  const [masterVol, setMasterVol] = React.useState(1);
  const dispatch = useDispatch();

  function pause() {
    dispatch(togglePlay(status === Status.Pause ? Status.Play : Status.Pause));
  }

  function onMainVolChange(e: number) {
    audioManager.setGainNodeForMaster(e);
    setMasterVol(e);
  }

  function openMixer() {
    addWindowToAction(
      dispatch,
      {
        header: 'Mixer',
        props: {},
        propsUniqueIdentifier: audioManager.mixer.viewId,
        x: 10,
        y: 10,
        overflow: true,
        verticalAlignment: VerticalAlignment.Bottom,
        view: MixerMaster,
        visible: true,
        windowSymbol: Symbol(),
        w: 1200,
        h: 700,
        windowId: getRandomWindowId()
      }
    )
  }

  const themeOptions: {
    label: string,
    value: string
  }[] = [
    {
      label: 'Default',
      value: 'default'
    },
    {
      label: 'Blue',
      value: 'blueacc'
    },
    {
      label: 'Red',
      value: 'redacc'
    },
    {
      label: 'Magenta',
      value: 'magentaacc'
    },
    {
      label: 'Green',
      value: 'greenacc'
    },
  ];

  const timeframeModeOptions = [
    {
      label: 'Time',
      value: TimeframeMode.Time,
    },
    {
      label: 'Tempo',
      value: TimeframeMode.Beat
    }
  ];

  function onThemeSelect(e: any) {
    document.body.setAttribute('data-theme', e);
  }

  function setTimeframeModeValue(value: any) {
    // setTimeframeModeValue
  }

  /**
   * @description Exporting into audio file.
   * @todo: This.
   */
  async function exportIntoAudioFile() {
    const data = await audioManager.simulateIntoOfflineAudio(tracks);
    const details = {
      audioName: 'new.mp3',
      colorAnnotation: randomColor(),
      duration: data.duration as number,
      mixerNumber: 0,
      effects: []
    };
    const newAudioId = audioManager.registerAudioInAudioBank(details, data);
    dispatch(addIntoAudioBank({
      ...details,
      audioId: newAudioId
    }));
  }

  return (
    <div className="flex justify-center items-center flex-row min-h-[8dvh] bg-darker shadow-lg">
      <nav>
        <ul className="list-none flex flex-row">
          <li className="inline-block hover:bg-slate-600 rounded-sm select-none cursor-pointer">
            <SimpleDropdown
              placeholder="SS"
              label={(item) => <>{item.label}</>}
              list={timeframeModeOptions}
              onSelect={setTimeframeModeValue}
            ></SimpleDropdown>
          </li>
          <li className="inline-block hover:bg-slate-600 rounded-sm select-none cursor-pointer">
            <SimpleDropdown
              placeholder="Select Theme"
              label={(item) => <>{item.label}</>}
              list={themeOptions}
              onSelect={onThemeSelect}
            ></SimpleDropdown>
          </li>
          <li
            onClick={exportIntoAudioFile}
            className="inline-block hover:bg-slate-600 p-3 rounded-sm text-xl select-none"
          >Export</li>
        </ul>
      </nav>
      <div className="volume px-6 text-center text-xs" title="Master Volume">
        <Knob r={12} onKnobChange={onMainVolChange} pd={8} scrollDelta={0.01} value={masterVol} />
        <div>{Math.round(masterVol * 100)}</div>
      </div>
      <Timer />
      <span
        onClick={pause}
        className="ml-2 pause play bg-secondary p-2 rounded-md cursor-pointer"
      >
        {
        status === Status.Pause ? 
          <Play c="#61E361" f="#51DE56" w={25} h={25} /> :
          <Pause c="#E1E361" f="#D1D256" w={25} h={25} />
        }
      </span>
      <div className="speaker-decibel ml-4">
        <VolumeLevels />
      </div>
      <div className="views flex ml-4">
        <button
          title="Open Mixer"
          className="border border-solid border-slate-600 rounded-sm hover:bg-slate-600 active:bg-slate-800"
          onClick={openMixer}
        >
          <Mixer w={40} h={40} stroke="rgb(100 116 139)" />
        </button>
      </div>
    </div>
  );
}
