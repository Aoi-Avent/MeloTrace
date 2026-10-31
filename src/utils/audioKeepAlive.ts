/**
 * Mobile Background Playback & MediaSession Keep-Alive
 *
 * iOS Safari suspends YouTube iframes when the screen is locked or browser is minimized.
 * This service plays an inaudible background audio loop to keep the mobile audio session
 * active, while syncing with navigator.mediaSession so lock-screen controls, Control Center,
 * and Apple Watch play/pause/skip buttons work seamlessly.
 */

import { MusicTrack } from '../types/music';

const KEEPALIVE_KEY = 'melotrace_keepalive_v1';

/** 実際に無音サンプルを含む 1 秒の WAV（8bit/8kHz/モノラル）を生成する */
function createSilentWavUrl(): string {
  const sampleRate = 8000;
  const samples = sampleRate; // 1 sec
  const buffer = new ArrayBuffer(44 + samples);
  const v = new DataView(buffer);
  const w = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  w(36, 'data');
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128); // 8bit unsigned: 128 = silence
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

class AudioKeepAliveService {
  private silentAudio: HTMLAudioElement | null = null;
  private artUrl: string | null = null;

  /** アルバムジャケットがあれば、ロック画面などの画像に使う */
  public setArtwork(url: string | null) {
    this.artUrl = url;
  }

  /** 無音ループによるバックグラウンド維持が有効か（既定: 有効） */
  public isEnabled(): boolean {
    try {
      return localStorage.getItem(KEEPALIVE_KEY) !== 'off';
    } catch (e) {
      return true;
    }
  }

  public setEnabled(on: boolean) {
    try {
      localStorage.setItem(KEEPALIVE_KEY, on ? 'on' : 'off');
    } catch (e) {}
    if (!on) this.stopLoop();
  }

  private ensureAudio() {
    if (this.silentAudio || typeof window === 'undefined') return;
    try {
      const a = new Audio(createSilentWavUrl());
      a.loop = true;
      a.setAttribute('playsinline', 'true');
      a.setAttribute('webkit-playsinline', 'true');
      this.silentAudio = a;
    } catch (e) {}
  }

  /** 曲が実際に再生され始めてから呼ぶ（再生開始前に別の音声を鳴らして競合させない） */
  public startLoop() {
    if (!this.isEnabled()) return;
    this.ensureAudio();
    if (this.silentAudio && this.silentAudio.paused) {
      try {
        const p = this.silentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
  }

  public stopLoop() {
    if (this.silentAudio && !this.silentAudio.paused) {
      try {
        this.silentAudio.pause();
      } catch (e) {}
    }
  }

  /** メタデータ（ロック画面・コントロールセンター表示）のみ更新する */
  public onPlay(track: MusicTrack | null) {
    if (track && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: 'MeloTrace',
          artwork: [
            ...(this.artUrl ? [{ src: this.artUrl, sizes: '600x600', type: 'image/jpeg' }] : []),
            { src: `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
            { src: `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
          ],
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch (e) {}
    }
  }

  public onPause() {
    this.stopLoop();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch (e) {}
    }
  }

  public updatePositionState(currentSec: number, durationSec: number) {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession.setPositionState
    ) {
      return;
    }
    if (!durationSec || isNaN(durationSec) || durationSec <= 0) return;
    try {
      const pos = Math.min(Math.max(0, currentSec), durationSec);
      navigator.mediaSession.setPositionState({
        duration: durationSec,
        playbackRate: 1.0,
        position: pos,
      });
    } catch (e) {}
  }

  public setupMediaSessionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (sec: number) => void;
  }) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        handlers.onPlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handlers.onPause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlers.onPrev();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handlers.onNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        handlers.onSeek(Math.max(0, (details.seekTime || 0) - offset));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        handlers.onSeek((details.seekTime || 0) + offset);
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        handlers.onPause();
      });
    } catch (e) {
      console.warn('Failed to register mediaSession actions', e);
    }
  }
}

export const audioKeepAlive = new AudioKeepAliveService();
