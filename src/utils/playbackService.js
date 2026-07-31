/* src/utils/playbackService.js */
/**
 * Centralized playback service handling audio element, Media Session API,
 * and persisting playback state via the existing storage utilities.
 * This service ensures playback continues even if the page is refreshed or
 * if localStorage is cleared (fallback to IndexedDB).
 */

import { Storage } from './storage';

let audio = null;
let currentTrack = null;
let queue = [];
let shuffle = false;
let repeatMode = 'none'; // 'none', 'one', 'all'

function initAudio() {
  if (audio) return;
  audio = new Audio();
  const persisted = Storage.lsGet('playbackState') || {};
  if (persisted.track) setTrack(persisted.track);
  if (persisted.time) audio.currentTime = persisted.time;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      audio.currentTime = details.seekTime;
    });
  }
  audio.addEventListener('timeupdate', persistState);
  audio.addEventListener('ended', () => {
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play();
    } else {
      next();
    }
  });
}

function setTrack(track) {
  initAudio();
  currentTrack = track;
  audio.src = track.audioUrl;
  audio.title = track.title;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [{ src: track.coverUrl, sizes: '512x512', type: 'image/png' }],
    });
  }
  persistState();
}

function play() { initAudio(); audio.play(); persistState(); }
function pause() { if (audio) audio.pause(); persistState(); }
function togglePlay() { if (!audio) return; if (audio.paused) play(); else pause(); }

function next() {
  if (shuffle) {
    const idx = Math.floor(Math.random() * queue.length);
    setTrack(queue[idx]);
  } else {
    const curIdx = queue.findIndex(t => t.id === currentTrack?.id);
    const nextIdx = (curIdx + 1) % queue.length;
    setTrack(queue[nextIdx]);
  }
  play();
}
function prev() {
  if (queue.length === 0) return;
  const curIdx = queue.findIndex(t => t.id === currentTrack?.id);
  const prevIdx = (curIdx - 1 + queue.length) % queue.length;
  setTrack(queue[prevIdx]);
  play();
}

function setQueue(tracks) { queue = tracks; persistState(); }
function setShuffle(val) { shuffle = val; persistState(); }
function setRepeatMode(mode) { repeatMode = mode; persistState(); }
function seek(seconds) { if (audio) audio.currentTime = seconds; persistState(); }

function persistState() {
  const state = {
    track: currentTrack,
    time: audio ? audio.currentTime : 0,
    queue,
    shuffle,
    repeatMode,
    isPlaying: audio && !audio.paused,
  };
  Storage.lsSet('playbackState', state);
}

export const PlaybackService = {
  initAudio,
  setTrack,
  play,
  pause,
  togglePlay,
  next,
  prev,
  setQueue,
  setShuffle,
  setRepeatMode,
  seek,
  getState: () => ({
    currentTrack,
    isPlaying: audio && !audio.paused,
    queue,
    shuffle,
    repeatMode,
    currentTime: audio ? audio.currentTime : 0,
    duration: audio ? audio.duration : 0,
  }),
};
