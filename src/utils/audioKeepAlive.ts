/**
 * Mobile Background Playback & MediaSession Keep-Alive
 *
 * iOS Safari suspends YouTube iframes when the screen is locked or browser is minimized.
 * This service plays an inaudible background audio loop to keep the mobile audio session
 * active, while syncing with navigator.mediaSession so lock-screen controls, Control Center,
 * and Apple Watch play/pause/skip buttons work seamlessly.
 */

import { MusicTrack } from '../types/music';

class AudioKeepAliveService {
  private silentAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Clean 1-second silent audio data URI that loops continuously on iOS to maintain the audio hardware session
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAEA';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.loop = true; // Keeps iOS Safari, Lock Screen, and CarPlay audio thread active
      this.silentAudio.volume = 0.0001;
      this.silentAudio.setAttribute('playsinline', 'true');
      this.silentAudio.setAttribute('webkit-playsinline', 'true');
      this.isInitialized = true;
    } catch (e) {
      // Silently catch
    }
  }

  public onPlay(track: MusicTrack | null) {
    if (!this.isInitialized) this.init();

    if (this.silentAudio) {
      try {
        const p = this.silentAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (e) {}
    }

    if (track && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: 'MeloTrace - Apple Music Player',
          artwork: [
            {
              src: `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`,
              sizes: '320x180',
              type: 'image/jpeg',
            },
            {
              src: `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`,
              sizes: '480x360',
              type: 'image/jpeg',
            },
          ],
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch (e) {}
    }
  }

  public onPause() {
    if (this.silentAudio && !this.silentAudio.paused) {
      this.silentAudio.pause();
    }
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
        if (this.silentAudio) this.silentAudio.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handlers.onPause();
        if (this.silentAudio) this.silentAudio.pause();
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
