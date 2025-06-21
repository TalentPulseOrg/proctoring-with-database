// audioClassifierService.js
// Service for real-time audio classification and volume analysis using MediaPipe AudioClassifier

import { AudioClassifier, FilesetResolver } from '@mediapipe/tasks-audio';

let audioClassifier = null;
let audioStream = null;
let audioContext = null;
let analyser = null;
let baseline = null;
let baselineSamples = [];
let collectingBaseline = true;
let baselineTimeout = null;

const BASELINE_DURATION = 3000; // ms
const LOW_THRESHOLD = 0.5;
const HIGH_THRESHOLD = 2.0;

export async function initAudioClassifier() {
  if (audioClassifier) return audioClassifier;
  const filesetResolver = await FilesetResolver.forAudioTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/wasm'
  );
  audioClassifier = await AudioClassifier.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite',
    },
    maxResults: 1,
    scoreThreshold: 0.5,
  });
  return audioClassifier;
}

export async function startMicStream(onDetect) {
  if (!audioClassifier) throw new Error('AudioClassifier not initialized');
  if (audioStream) stopMicStream();

  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(audioStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  collectingBaseline = true;
  baselineSamples = [];
  if (baselineTimeout) clearTimeout(baselineTimeout);
  baselineTimeout = setTimeout(() => {
    if (baselineSamples.length > 0) {
      baseline = baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length;
    } else {
      baseline = 0.01;
    }
    collectingBaseline = false;
  }, BASELINE_DURATION);

  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);

  async function processAudio() {
    analyser.getFloatTimeDomainData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / bufferLength);
    if (collectingBaseline) {
      baselineSamples.push(rms);
    }
    let volumeLevel = baseline ? rms / baseline : 1;
    let volumeFlag = null;
    if (!collectingBaseline) {
      if (volumeLevel < LOW_THRESHOLD) volumeFlag = 'Too Low';
      else if (volumeLevel > HIGH_THRESHOLD) volumeFlag = 'Too High';
    }

    // Run classification
    const audioBuffer = audioContext.createBuffer(1, bufferLength, audioContext.sampleRate);
    audioBuffer.copyToChannel(dataArray, 0);
    const wavBlob = bufferToWav(audioBuffer, audioContext.sampleRate);
    const file = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
    let label = 'Unknown';
    let confidence = 0;
    let suspicious = false;
    try {
      const result = await audioClassifier.classify(file);
      if (result && result.length > 0 && result[0].categories.length > 0) {
        label = result[0].categories[0].categoryName;
        confidence = result[0].categories[0].score;
        if (["Speech", "Music", "Typing"].includes(label)) suspicious = true;
      }
    } catch (e) {
      // ignore classification errors
    }
    if (volumeFlag) suspicious = true;
    onDetect({ label, confidence, volumeLevel, volumeFlag, suspicious });
    requestAnimationFrame(processAudio);
  }
  processAudio();
}

export function stopMicStream() {
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  collectingBaseline = false;
  baselineSamples = [];
  baseline = null;
  if (baselineTimeout) clearTimeout(baselineTimeout);
}

// Helper: Convert AudioBuffer to WAV Blob
function bufferToWav(buffer, sampleRate) {
  const numOfChan = buffer.numberOfChannels,
    length = buffer.length * numOfChan * 2 + 44,
    bufferArray = new ArrayBuffer(length),
    view = new DataView(bufferArray),
    channels = [];
  let i, sample, offset = 0, pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this demo)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
} 