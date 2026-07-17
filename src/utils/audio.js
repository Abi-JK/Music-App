export async function cutAudio(blob, startTime, endTime) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  
  const sampleRate = audioBuffer.sampleRate;
  const startOffset = Math.max(0, Math.floor(startTime * sampleRate));
  const endOffset = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
  const frameCount = endOffset - startOffset;
  
  if (frameCount <= 0) throw new Error("Invalid time range");
  
  const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0, startTime, endTime - startTime);
  
  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWav(renderedBuffer);
}

function bufferToWav(abuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  let offset = 0;
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + abuffer.length * numOfChan * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, abuffer.sampleRate, true); offset += 4;
  view.setUint32(offset, abuffer.sampleRate * 2 * numOfChan, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, abuffer.length * numOfChan * 2, true); offset += 4;
  
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    const channel = abuffer.getChannelData(i);
    let offsetIdx = offset + (i * 2);
    for (let j = 0; j < channel.length; j++) {
      let sample = Math.max(-1, Math.min(1, channel[j]));
      sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(offsetIdx, sample, true);
      offsetIdx += numOfChan * 2;
    }
  }
  
  return new Blob([view], { type: 'audio/wav' });
}
