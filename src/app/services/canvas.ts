export type CanvasRedrawInformation = {
  buffer: Array<Float32Array>,
  canvas: OffscreenCanvas
}

self.addEventListener(
  'message',
  function(event: MessageEvent<CanvasRedrawInformation>) {
    const {
      buffer,
      canvas: offcanvas
    } = event.data;
    const width = offcanvas.width, height = offcanvas.height;

    const context = offcanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const channelCount = buffer.length;
  
    context.strokeStyle = '#ccc';
    context.fillStyle = '#2229'
    context.beginPath();
    context.fillRect(0, 0, width, height);
    context.moveTo(0, height / 2);

    const mul = 100;

    // let percent = 0, dataProcessed = channelCount * buffer[0].length;
    // let progress = mul / dataProcessed;

    for (let channelNumber = 0; channelNumber < channelCount; ++channelNumber) {
      const channelData = buffer[channelNumber];

      let x = 0;
      const incr = (width / channelData.length) * mul;

      for (let index = 0; index < channelData.length; index += mul) {
        const normalizedValue = ((channelData[index] + 1) / 2.0) * height;
        context.lineTo(x, normalizedValue);
        x += incr;
      }
    }

    context.lineWidth = 2;
    context.stroke();

    postMessage({done: 'true'});
  });
