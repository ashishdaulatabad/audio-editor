import {audioManager} from '@/app/services/audio/audiotrackmanager';
import {AudioTrackDetails} from '@/app/state/trackdetails/trackdetails';
import {clamp} from '@/app/utils';
import {AudioTrackManipulationMode} from '../editor/trackaudio';

const SEC_TO_MICROSEC = 1000000; // 1 second in microseconds

const TRACK_CONTAINER_CLASSLIST = "\
track-audio shadow-sm shadow-black text-left overflow-x-hidden overflow-y-clip absolute rounded-sm bg-slate-900/80 data-[selected='true']:bg-red-950/80 z-[2]\
";

const TRACK_TITLE_CONTAINER_CLASSLIST = "\
data-[selected='true']:bg-red-500 w-full\
";

const SPAN_CLASSLIST = "\
text-sm relative text-left text-white select-none max-w-full block overflow-hidden text-ellipsis text-nowrap\
";

export class AudioTrackElement extends HTMLElement {
  static observedAttributes = [
    'trackSource',
    'lineDistance',
    'unitTime',
    'dataId',
    'height'
  ];
  static cursorClasses = [
    'cursor-grab',
    'cursor-grabbing',
    'cursor-w-resize',
    'cursor-e-resize',
  ];

  canvasElement: HTMLCanvasElement = document.createElement('canvas');
  canvasContext: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;
  titleElement: HTMLSpanElement = document.createElement('span');
  // TODO: Set a default value
  _trackSource: AudioTrackDetails = {} as AudioTrackDetails;
  _lineDistance: number = 0;
  _unitTime: number = 1;
  _id: number = -1;
  _width: number = 1;
  _height: number = 200;
  _audioId: symbol | null = null;
  unitTimeMicros: number = SEC_TO_MICROSEC;

  _manipulationMode: AudioTrackManipulationMode = 
    AudioTrackManipulationMode.None;

  get trackSource(): AudioTrackDetails {
    return this._trackSource;
  }

  get dataId() {
    return this._id;
  }

  set dataId(value: number) {
    this._id = value;
  }

  get height() {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  get unitTime(): number {
    return this._unitTime;
  }

  set unitTime(value: number) {
    this._unitTime = value;
    this.unitTimeMicros = this._unitTime * SEC_TO_MICROSEC;
    // TODO: See what's changing.
  }

  get lineDistance(): number {
    return this._lineDistance;
  }

  // On setting the lineDistance, set the canvas width and change
  // the image according to the lineDistance and the details with the audiotrack
  // length.
  set lineDistance(value: number) {
    this._lineDistance = value;
    // This should change the position, width and scrollLeft.
    this.setWidthAndScrollLeft();
  }

  // On Setting this value, change the computation.
  set trackSource(audioTrackDetails: AudioTrackDetails) {
    this._trackSource = audioTrackDetails;

    // Changes the width, scrollLeft and probably the contents of canvas.
    if (!this._audioId || this._audioId !== audioTrackDetails.audioId) {
      this._audioId = audioTrackDetails.audioId;
      this.setWidthAndScrollLeft();
      this.drawCanvas();
    }
  }

  constructor() {
    super();
    this.unitTimeMicros = this._unitTime * SEC_TO_MICROSEC;
  }

  connectedCallback() {
    console.assert(this.isConnected, 'AudioTrackElement not connected');
    this.initializeAudioTrack();
  }

  private drawCanvas() {
    const existingOffcanvas = audioManager.getOffscreenCanvasDrawn(
      this._trackSource.audioId
    );

    if (existingOffcanvas) {
      this.canvasContext.drawImage(
        existingOffcanvas, 0, 0, this._width, this._height - 22
      );
      return;
    }
  
    const unitTime = this.unitTime;
    const lineDist = 200;
    const time = this._trackSource.duration as number;
    const width = Math.max((time / unitTime) * lineDist, 800);
    const height = 200;

    let offcanvas = new OffscreenCanvas(width, height);
    const context = offcanvas.getContext('2d');
  
    if (!context) {
      console.error('There was an error while rendering Context');
      return;
    }
  
    const buffer = audioManager.getAudioBuffer(
      this._trackSource.audioId
    ) as AudioBuffer;
    
    context.strokeStyle = '#e2e3ef';
    context.fillStyle = '#fff1';
    context.beginPath();
    context.clearRect(0, 0, width, height);
    context.fillRect(0, 0, width, height);
    context.moveTo(0, height / 2);
    context.lineWidth = 2;
  
    const proportionalIncrement = Math.ceil((128 * width) / 800);
  
    const mul = clamp(proportionalIncrement, 1, 128);
  
    const heightPerChannel = height / buffer.numberOfChannels;
  
    // Assuming that total channels are two.
    for (
      let channel = 0, vertical = 0; 
      channel < buffer.numberOfChannels; 
      ++channel, vertical += heightPerChannel
    ) {
      const channelData = buffer.getChannelData(channel);
      context.moveTo(0, (1 / 2.0) * heightPerChannel + vertical)
  
      let x = 0;
      const incr = (width / channelData.length) * mul;
  
      for (let index = 0; index < channelData.length; index += mul) {
        const normalizedValue = 
          ((channelData[index] + 1) / 2.0) * heightPerChannel + vertical;
      
        context.lineTo(x, normalizedValue);
        x += incr;
      }
    }
  
    context.stroke();
    audioManager.useManager().storeOffscreenCanvasDrawn(
      this._trackSource.audioId,
      offcanvas
    );

    this.canvasContext.drawImage(
      offcanvas, 0, 0, this._width, this._height - 22
    );
  }

  private calculateLeft() {
    const offsetInMicros = this._trackSource.trackDetail.offsetInMicros;
    return (offsetInMicros / this.unitTimeMicros) * this._lineDistance;
  }

  private setWidthAndScrollLeft() {
    const startOffsetMicros = this._trackSource.trackDetail.startOffsetInMicros;
    const endOffsetMicros = this._trackSource.trackDetail.endOffsetInMicros;
    const timeUnitMicros = this._unitTime * SEC_TO_MICROSEC;

    const leftScrollAmount = (startOffsetMicros / timeUnitMicros) * this._lineDistance;
    const endPointOfWidth = (endOffsetMicros / timeUnitMicros) * this._lineDistance;
    const totalWidth = endPointOfWidth - leftScrollAmount;
    this._width = totalWidth;

    this.style.width = totalWidth + 'px';
    this.titleElement.style.left = leftScrollAmount + 'px';
    this.scrollLeft = leftScrollAmount;
  }

  private createTitleContainerElement() {
    this.setWidthAndScrollLeft();
    const titleContainer = document.createElement('div');
    titleContainer.classList.add(
      ...TRACK_TITLE_CONTAINER_CLASSLIST.split(' ')
    );
    titleContainer.style.backgroundColor = 
      this._trackSource.trackDetail.selected ?
        'rgba(239, 68, 68)' : 
        this._trackSource.colorAnnotation;
    titleContainer.style.width = this._width + 'px';  
    
    const span = document.createElement('span');
    span.classList.add(...SPAN_CLASSLIST.split(' '));
    this.titleElement = span;
    span.textContent = this._trackSource.audioName;
    
    titleContainer.appendChild(span);
    return titleContainer;
  }

  // TODO: Implement dragging or resizing based on the 
  // cursor position.
  // Then emit the changes to parent.
  private onHoveringOverSelf(event: MouseEvent) {
    const {offsetX} = event;
    const {clientWidth} = this;

    this._manipulationMode = 
      // Cursor at the start of the trackAudio DOM Element
      offsetX <= 5 ?
      AudioTrackManipulationMode.ResizeStart :
      // Cursor at the end of the trackAudio DOM Element
      clientWidth - offsetX <= 5 ?
      AudioTrackManipulationMode.ResizeEnd :
      event.buttons === 1 ?
      AudioTrackManipulationMode.Move :
      AudioTrackManipulationMode.None;
    
    this.handleActionByPos();
  }

  private handleActionByPos() {
    this.classList.remove(...AudioTrackElement.cursorClasses);
    const mode = this._manipulationMode;
    
    this.classList.add(AudioTrackElement.cursorClasses[mode]);
  }

  private initializeAudioTrack() {
    const titleContainer = this.createTitleContainerElement();
    const shadow = this.attachShadow({mode: 'open'});

    this.canvasElement.width = this._width;
    this.canvasElement.height = this._height - 22;
    this.classList.add(...TRACK_CONTAINER_CLASSLIST.split(' '));
    this.style.width = this._width + 'px';
    this.style.height = this._height + 'px';
    this.style.left = this.calculateLeft() + 'px';

    shadow.appendChild(titleContainer);
    shadow.appendChild(this.canvasElement);

    this.drawCanvas();
    
    this.onmouseover = this.onHoveringOverSelf.bind(this);
    this.onmousemove = this.onHoveringOverSelf.bind(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-track': AudioTrackElement
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'audio-track': React.HTMLAttributes<HTMLElement> & 
          React.RefAttributes<AudioTrackElement> & {
            trackSource: AudioTrackDetails;
            lineDistance: number;
            unitTime: number;
            dataId: number;
            height: number;
          }
      }
    }
  }
}
