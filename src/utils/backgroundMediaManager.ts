/**
 * Background Media & Magic Capsule (Dynamic Island) Manager
 * 
 * Features:
 * 1. Infinite Looping Silent PCM Audio Engine:
 *    Uses a dynamically generated 10-second silent WAV Blob with loop=true.
 *    This gives Android Chrome & MagicOS (Honor) an unbroken hardware audio session
 *    that never gets closed or timed out by the OS.
 * 2. Complete MediaSession API Integration:
 *    Publishes artwork, title, artist, duration, position, and playbackState to
 *    Honor Magic Capsule, iOS Dynamic Island, Android Notification Bar & Lock Screen.
 * 3. Bidirectional IFrame & postMessage Control:
 *    Syncs Play, Pause, Seek, Volume, and Mute with YouTube & custom video players.
 * 4. Resilient Play/Pause Handlers:
 *    Guarantees that tapping 'Play' or 'Pause' from the phone's Magic Capsule
 *    keeps the capsule alive and responds instantly without disappearing.
 */

export interface MediaTrackInfo {
  id?: string;
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  videoUrl?: string;
  platform?: string;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  isMuted?: boolean;
  volume?: number;
}

type MediaListener = (state: MediaPlaybackState) => void;

export interface MediaPlaybackState {
  currentTrack: MediaTrackInfo | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0 to 100
  currentTime: number;
  duration: number;
  isBackgroundPlayEnabled: boolean;
  isCapsuleVisible: boolean;
  isCapsuleExpanded: boolean;
  playerType: 'youtube' | 'direct_video' | 'direct_audio' | 'other' | null;
}

class BackgroundMediaManager {
  private static instance: BackgroundMediaManager;

  private listeners: Set<MediaListener> = new Set();
  private wakeLock: any = null;

  private ytPlayer: any = null;
  private currentIframeId: string | null = null;
  private isYtApiReady: boolean = false;
  private isYtApiLoading: boolean = false;
  private progressInterval: any = null;
  private silentAudioElement: HTMLAudioElement | null = null;
  private activeMediaElement: HTMLMediaElement | null = null;
  private mediaElementListeners: { [key: string]: EventListener } = {};

  private audioCtx: AudioContext | null = null;
  private audioGain: GainNode | null = null;
  private audioOsc: OscillatorNode | null = null;

  // Ultra-lightweight static 44-byte silent WAV audio anchor fallback
  private static readonly SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  private generateSilentWavBlobUrl(durationSeconds: number = 5): string {
    try {
      const sampleRate = 8000; // 8kHz mono is ultra light: 8000 * 5 * 2 = 80 KB
      const numChannels = 1;
      const bitsPerSample = 16;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;
      const numSamples = sampleRate * durationSeconds;
      const dataSize = numSamples * blockAlign;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      // RIFF chunk descriptor
      view.setUint8(0, 'R'.charCodeAt(0));
      view.setUint8(1, 'I'.charCodeAt(0));
      view.setUint8(2, 'F'.charCodeAt(0));
      view.setUint8(3, 'F'.charCodeAt(0));
      view.setUint32(4, 36 + dataSize, true);
      view.setUint8(8, 'W'.charCodeAt(0));
      view.setUint8(9, 'A'.charCodeAt(0));
      view.setUint8(10, 'V'.charCodeAt(0));
      view.setUint8(11, 'E'.charCodeAt(0));

      // "fmt " sub-chunk
      view.setUint8(12, 'f'.charCodeAt(0));
      view.setUint8(13, 'm'.charCodeAt(0));
      view.setUint8(14, 't'.charCodeAt(0));
      view.setUint8(15, ' '.charCodeAt(0));
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
      view.setUint16(22, numChannels, true); // NumChannels
      view.setUint32(24, sampleRate, true); // SampleRate
      view.setUint32(28, byteRate, true); // ByteRate
      view.setUint16(32, blockAlign, true); // BlockAlign
      view.setUint16(34, bitsPerSample, true); // BitsPerSample

      // "data" sub-chunk
      view.setUint8(36, 'd'.charCodeAt(0));
      view.setUint8(37, 'a'.charCodeAt(0));
      view.setUint8(38, 't'.charCodeAt(0));
      view.setUint8(39, 'a'.charCodeAt(0));
      view.setUint32(40, dataSize, true);

      // Remaining bytes in buffer default to 0 (silent PCM samples)
      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (e) {
      return BackgroundMediaManager.SILENT_WAV_DATA_URI;
    }
  }

  private state: MediaPlaybackState = {
    currentTrack: {
      id: 'dQw4w9WgXcQ',
      title: 'Kanal Media & Kajian Digital Madrasah',
      artist: 'Ust. Jaenal Maskun, S.Pd.I.',
      album: 'Kanal Resmi Media Digital',
      artworkUrl: 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=400&q=80',
      videoUrl: 'https://www.youtube.com/@jaenalmaskunofficial3977',
      platform: 'YouTube',
    },
    isPlaying: false,
    isMuted: false,
    volume: 100,
    currentTime: 0,
    duration: 360,
    isBackgroundPlayEnabled: true,
    isCapsuleVisible: true,
    isCapsuleExpanded: false,
    playerType: 'youtube',
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedBg = localStorage.getItem('madrasah_bg_play_enabled');
        if (savedBg !== null) {
          this.state.isBackgroundPlayEnabled = savedBg === 'true';
        }
      } catch (e) {}

      this.initNativeAudioElement();
      this.initMediaSession();
      this.initVisibilityListener();
      this.initPostMessageListener();

      // Warmup on first interaction to unlock Android OS MediaSession & Audio Focus
      const unlockAudio = () => {
        this.warmupAudio();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true, once: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    }
  }

  private initNativeAudioElement() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.silentAudioElement) {
        const wavUrl = this.generateSilentWavBlobUrl(5);
        const audio = new Audio(wavUrl);
        audio.loop = true;
        audio.volume = 0.05;
        audio.preload = 'auto';
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        this.silentAudioElement = audio;
      }
    } catch (e) {}
  }

  private startWebAudioKeepalive() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (!this.audioOsc) {
        // Continuous ultra-low inaudible oscillator node to keep hardware audio session awake
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, this.audioCtx.currentTime); // Inaudible sub-bass anchor
        gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime); // Micro amplitude prevents OS sleep

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();

        this.audioOsc = osc;
        this.audioGain = gain;
      }
    } catch (e) {}
  }

  public static getInstance(): BackgroundMediaManager {
    if (!BackgroundMediaManager.instance) {
      BackgroundMediaManager.instance = new BackgroundMediaManager();
    }
    return BackgroundMediaManager.instance;
  }

  public getState(): MediaPlaybackState {
    return { ...this.state };
  }

  public subscribe(listener: MediaListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (e) {
        console.error('Error in media listener:', e);
      }
    });
  }

  public warmupAudio() {
    // Unlocks Android Chrome audio session for native capsule & lock screen
    try {
      this.startWebAudioKeepalive();
      if (this.silentAudioElement) {
        const p = this.silentAudioElement.play();
        if (p !== undefined) {
          p.then(() => {
            if (!this.state.isPlaying) {
              this.silentAudioElement?.pause();
            }
          }).catch(() => {});
        }
      }
    } catch (e) {}

    this.sendCommandToIframe('unMute', []);
    this.sendCommandToIframe('setVolume', [100]);
    if (this.ytPlayer) {
      try {
        if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
        if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(100);
      } catch (e) {}
    }
  }

  private async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {}
  }

  private releaseWakeLock() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release().catch(() => {});
        this.wakeLock = null;
      }
    } catch (e) {}
  }

  private initPostMessageListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      try {
        if (typeof event.data === 'string') {
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch (err) {
            return;
          }

          if (data && data.event === 'infoDelivery' && data.info) {
            const info = data.info;
            if (info.currentTime !== undefined && !isNaN(info.currentTime)) {
              this.state.currentTime = Math.floor(info.currentTime);
            }
            if (info.duration !== undefined && !isNaN(info.duration) && info.duration > 0) {
              this.state.duration = Math.floor(info.duration);
            }
            if (info.playerState !== undefined) {
              this.handleYouTubeStateChange(info.playerState);
            }
            // Auto unmute if YouTube reports muted
            if (info.muted === true || info.volume === 0) {
              this.sendCommandToIframe('unMute', []);
              this.sendCommandToIframe('setVolume', [100]);
            }
            this.updateMediaSessionPosition();
            this.notify();
          } else if (data && data.event === 'onStateChange' && data.info !== undefined) {
            this.handleYouTubeStateChange(data.info);
          }
        }
      } catch (e) {}
    });
  }

  private loadYouTubeIframeAPI() {
    if (typeof window === 'undefined') return;

    if ((window as any).YT && (window as any).YT.Player) {
      this.isYtApiReady = true;
      return;
    }

    if (this.isYtApiLoading) return;
    this.isYtApiLoading = true;

    const prevCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      this.isYtApiReady = true;
      this.isYtApiLoading = false;
      if (typeof prevCallback === 'function') {
        prevCallback();
      }
      if (this.currentIframeId) {
        this.attachToYouTubeIframe(this.currentIframeId);
      }
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
  }

  public attachToYouTubeIframe(iframeId: string) {
    this.currentIframeId = iframeId;
    if (typeof window === 'undefined') return;

    const iframeEl = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (iframeEl && iframeEl.contentWindow) {
      try {
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: iframeId }), '*');
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: 100 }), '*');
        if (this.state.isPlaying) {
          iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        }
      } catch (e) {}
    }
  }

  private sendCommandToIframe(func: string, args: any = []) {
    if (typeof window === 'undefined') return;

    const safeArgs = Array.isArray(args) ? args : (args !== undefined && args !== '' ? [args] : []);

    let targetIframes: HTMLIFrameElement[] = [];

    if (this.currentIframeId) {
      const el = document.getElementById(this.currentIframeId) as HTMLIFrameElement | null;
      if (el) targetIframes.push(el);
    }

    // Fallback: discover all embedded media / youtube iframes on the page
    const allIframes = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="embed"]') as NodeListOf<HTMLIFrameElement>;
    allIframes.forEach((ifr) => {
      if (!targetIframes.includes(ifr)) {
        targetIframes.push(ifr);
      }
    });

    targetIframes.forEach((iframe) => {
      if (iframe && iframe.contentWindow) {
        try {
          // Handshake listening event
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');

          // Send Array format
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: safeArgs,
          }), '*');

          // Send string/scalar format fallback
          if (safeArgs.length === 0) {
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: func,
              args: '',
            }), '*');
          } else if (safeArgs.length === 1) {
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: func,
              args: safeArgs[0],
            }), '*');
          }

          // Ensure full volume and unmuted sound whenever play or unmute is invoked
          if (func === 'unMute' || func === 'playVideo') {
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
              '*'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
              '*'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
              '*'
            );
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'setVolume', args: 100 }),
              '*'
            );
          }
        } catch (e) {}
      }
    });

    // Also unmute any direct HTML5 video/audio elements on the page
    try {
      const allMedia = document.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>;
      allMedia.forEach((media) => {
        media.muted = false;
        media.volume = 1.0;
      });
    } catch (e) {}
  }

  private handleYouTubeStateChange(playerState: number) {
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (playerState === 1) {
      // PLAYING
      this.state.isPlaying = true;
      this.state.isCapsuleVisible = true;
      this.startProgressTracking();
      this.requestWakeLock();
      this.updateMediaSessionState('playing');
    } else if (playerState === 2) {
      // PAUSED
      if (typeof document !== 'undefined' && document.hidden && this.state.isBackgroundPlayEnabled) {
        this.state.isPlaying = true;
        this.state.isCapsuleVisible = true;
        this.updateMediaSessionState('playing');
        this.startProgressTracking();
        this.notify();
        return;
      }
      this.state.isPlaying = false;
      this.releaseWakeLock();
      this.updateMediaSessionState('paused');
    } else if (playerState === 0) {
      // ENDED
      this.state.isPlaying = false;
      this.releaseWakeLock();
      this.updateMediaSessionState('paused');
    } else if (playerState === 3) {
      // BUFFERING
      this.state.isPlaying = true;
      this.updateMediaSessionState('playing');
    }
    this.syncYouTubeTime();
    this.notify();
  }

  private startProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.state.isPlaying) {
        if (this.state.duration > 0 && this.state.currentTime < this.state.duration) {
          this.state.currentTime += 1;
        }
        this.updateMediaSessionPosition();
        this.notify();
      }
      this.syncYouTubeTime();
    }, 1000);
  }

  private syncYouTubeTime() {
    if (!this.ytPlayer) return;

    try {
      if (typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime();
        if (typeof cur === 'number' && !isNaN(cur) && cur > 0) {
          this.state.currentTime = Math.floor(cur);
        }
      }
      if (typeof this.ytPlayer.getDuration === 'function') {
        const dur = this.ytPlayer.getDuration();
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
          this.state.duration = Math.floor(dur);
        }
      }
      if (typeof this.ytPlayer.isMuted === 'function') {
        this.state.isMuted = this.ytPlayer.isMuted();
      }
      if (typeof this.ytPlayer.getVolume === 'function') {
        this.state.volume = this.ytPlayer.getVolume();
      }
    } catch (e) {}
  }

  /**
   * Sets up MediaSession API for Honor Magic Capsule / iOS Dynamic Island
   */
  private initMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    try {
      ms.setActionHandler('play', () => {
        this.play();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('play-media-channel'));
        }
      });

      ms.setActionHandler('pause', () => {
        this.pause();
      });

      ms.setActionHandler('seekbackward', (details) => {
        const skipTime = details?.seekOffset || 10;
        this.seekRelative(-skipTime);
      });

      ms.setActionHandler('seekforward', (details) => {
        const skipTime = details?.seekOffset || 10;
        this.seekRelative(skipTime);
      });

      ms.setActionHandler('previoustrack', () => {
        this.seekRelative(-10);
      });

      ms.setActionHandler('nexttrack', () => {
        this.seekRelative(10);
      });

      ms.setActionHandler('seekto', (details) => {
        if (details?.seekTime !== undefined && !isNaN(details.seekTime)) {
          this.seekTo(details.seekTime);
        }
      });

      ms.setActionHandler('stop', () => {
        this.pause();
      });
    } catch (e) {
      console.warn('Error setting MediaSession handlers:', e);
    }
  }

  private updateMediaSessionMetadata(track: MediaTrackInfo) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const title = track.title || 'Kajian & Video Madrasah';
      const artist = track.artist || 'Ust. Jaenal Maskun, S.Pd.I.';
      const album = track.album || 'Kanal Media Digital Madrasah';
      const artwork = (track.artworkUrl && track.artworkUrl.startsWith('http'))
        ? track.artworkUrl
        : 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=512&q=80';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: album,
        artwork: [
          { src: artwork, sizes: '96x96', type: 'image/jpeg' },
          { src: artwork, sizes: '128x128', type: 'image/jpeg' },
          { src: artwork, sizes: '192x192', type: 'image/jpeg' },
          { src: artwork, sizes: '256x256', type: 'image/jpeg' },
          { src: artwork, sizes: '384x384', type: 'image/jpeg' },
          { src: artwork, sizes: '512x512', type: 'image/jpeg' },
        ]
      });
    } catch (e) {}
  }

  private updateMediaSessionState(playbackState: 'none' | 'paused' | 'playing') {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = playbackState;
    } catch (e) {}
  }

  private updateMediaSessionPosition() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      if (
        typeof navigator.mediaSession.setPositionState === 'function' &&
        this.state.duration > 0 &&
        this.state.currentTime >= 0 &&
        this.state.currentTime <= this.state.duration
      ) {
        navigator.mediaSession.setPositionState({
          duration: this.state.duration,
          playbackRate: this.state.isPlaying ? 1 : 0,
          position: this.state.currentTime
        });
      }
    } catch (e) {}
  }

  private initVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background / tab switched / minimized
        if (this.state.currentTrack && this.state.isPlaying && this.state.isBackgroundPlayEnabled) {
          this.state.isPlaying = true;
          this.state.isCapsuleVisible = true;
          this.updateMediaSessionState('playing');
          this.updateMediaSessionPosition();
          this.startProgressTracking();
          this.notify();
        }
      } else {
        // App returned to foreground
        if (this.state.isPlaying) {
          this.syncYouTubeTime();
          this.sendCommandToIframe('unMute', '');
          this.sendCommandToIframe('setVolume', [100]);
          this.sendCommandToIframe('playVideo', '');
          if (this.ytPlayer) {
            try {
              if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
              if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(100);
              if (typeof this.ytPlayer.playVideo === 'function') this.ytPlayer.playVideo();
            } catch (e) {}
          }
          this.updateMediaSessionState('playing');
          this.notify();
        }
      }
    });
  }

  /**
   * Directly attaches a native HTML5 video/audio element to the phone's native Magic Capsule / MediaSession
   */
  public attachMediaElement(element: HTMLMediaElement | null) {
    // 1. Clean up old listeners
    if (this.activeMediaElement && Object.keys(this.mediaElementListeners).length > 0) {
      for (const [event, listener] of Object.entries(this.mediaElementListeners)) {
        this.activeMediaElement.removeEventListener(event, listener);
      }
      this.mediaElementListeners = {};
    }

    this.activeMediaElement = element;

    if (!element) return;

    // 2. Set up event synchronization
    const onPlay = () => {
      this.state.isPlaying = true;
      this.state.isCapsuleVisible = true;
      this.updateMediaSessionState('playing');
      this.updateMediaSessionPosition();
      this.startWebAudioKeepalive();
      this.notify();
    };

    const onPause = () => {
      this.state.isPlaying = false;
      this.updateMediaSessionState('paused');
      this.updateMediaSessionPosition();
      this.notify();
    };

    const onTimeUpdate = () => {
      if (!isNaN(element.currentTime) && element.currentTime >= 0) {
        this.state.currentTime = Math.floor(element.currentTime);
      }
      if (!isNaN(element.duration) && element.duration > 0) {
        this.state.duration = Math.floor(element.duration);
      }
      this.updateMediaSessionPosition();
      this.notify();
    };

    const onLoadedMetadata = () => {
      if (!isNaN(element.duration) && element.duration > 0) {
        this.state.duration = Math.floor(element.duration);
      }
      this.updateMediaSessionPosition();
      this.notify();
    };

    const onVolumeChange = () => {
      this.state.volume = Math.round(element.volume * 100);
      this.state.isMuted = element.muted || element.volume === 0;
      this.notify();
    };

    const onEnded = () => {
      this.state.isPlaying = false;
      this.updateMediaSessionState('none');
      this.notify();
    };

    this.mediaElementListeners = {
      play: onPlay,
      pause: onPause,
      timeupdate: onTimeUpdate,
      loadedmetadata: onLoadedMetadata,
      volumechange: onVolumeChange,
      ended: onEnded
    };

    for (const [event, listener] of Object.entries(this.mediaElementListeners)) {
      element.addEventListener(event, listener);
    }

    // Initial state sync
    if (!isNaN(element.duration) && element.duration > 0) {
      this.state.duration = Math.floor(element.duration);
    }
    if (!isNaN(element.currentTime)) {
      this.state.currentTime = Math.floor(element.currentTime);
    }
    this.state.isPlaying = !element.paused;
    this.updateMediaSessionState(!element.paused ? 'playing' : 'paused');
    this.updateMediaSessionPosition();
  }

  // ==========================================
  // PUBLIC PLAYBACK API
  // ==========================================

  public registerActiveTrack(
    track: MediaTrackInfo,
    playerType: 'youtube' | 'direct_video' | 'direct_audio' | 'other' = 'youtube',
    iframeId?: string
  ) {
    if (iframeId) {
      this.currentIframeId = iframeId;
    }

    this.state.currentTrack = track;
    this.state.playerType = playerType;
    this.state.isPlaying = true;
    this.state.isCapsuleVisible = true;
    this.state.isMuted = false;
    this.state.volume = 100;
    this.state.currentTime = track.currentTime || 0;
    this.state.duration = track.duration || 360;

    this.updateMediaSessionMetadata(track);
    this.updateMediaSessionState('playing');
    this.startProgressTracking();
    this.requestWakeLock();
    this.updateMediaSessionPosition();

    // Start Web Audio anchor so Android Chrome binds OS media capsule & notification
    this.startWebAudioKeepalive();
    if (this.silentAudioElement) {
      this.silentAudioElement.play().catch(() => {});
    }

    // If native video/audio element is attached, play it directly
    if (this.activeMediaElement) {
      this.activeMediaElement.muted = false;
      this.activeMediaElement.volume = 1.0;
      this.activeMediaElement.play().catch(() => {});
    }

    // Auto-unmute and command play immediately with staggered retries for Android speaker output
    const triggerUnmutePlay = () => {
      this.sendCommandToIframe('unMute', []);
      this.sendCommandToIframe('setVolume', [100]);
      this.sendCommandToIframe('playVideo', []);

      if (this.ytPlayer) {
        try {
          if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
          if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(100);
          if (typeof this.ytPlayer.playVideo === 'function') this.ytPlayer.playVideo();
        } catch (e) {}
      }

      if (this.activeMediaElement && this.activeMediaElement.paused) {
        this.activeMediaElement.play().catch(() => {});
      }
    };

    triggerUnmutePlay();
    setTimeout(triggerUnmutePlay, 250);
    setTimeout(triggerUnmutePlay, 700);
    setTimeout(triggerUnmutePlay, 1300);

    this.notify();
  }

  public play() {
    this.state.isPlaying = true;
    this.state.isCapsuleVisible = true;
    this.state.isMuted = false;
    this.state.volume = 100;

    this.updateMediaSessionState('playing');
    this.updateMediaSessionPosition();

    this.startWebAudioKeepalive();
    if (this.silentAudioElement) {
      this.silentAudioElement.play().catch(() => {});
    }

    if (this.activeMediaElement) {
      this.activeMediaElement.play().catch(() => {});
    }

    const triggerUnmutePlay = () => {
      this.sendCommandToIframe('unMute', []);
      this.sendCommandToIframe('setVolume', [100]);
      this.sendCommandToIframe('playVideo', []);

      if (this.ytPlayer) {
        try {
          if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
          if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(100);
          if (typeof this.ytPlayer.playVideo === 'function') this.ytPlayer.playVideo();
        } catch (e) {}
      }

      if (this.activeMediaElement && this.activeMediaElement.paused) {
        this.activeMediaElement.play().catch(() => {});
      }
    };

    triggerUnmutePlay();
    setTimeout(triggerUnmutePlay, 250);
    setTimeout(triggerUnmutePlay, 700);
    setTimeout(triggerUnmutePlay, 1300);

    this.startProgressTracking();
    this.requestWakeLock();
    this.notify();
  }

  public pause() {
    this.state.isPlaying = false;

    this.updateMediaSessionState('paused');
    this.updateMediaSessionPosition();

    if (this.silentAudioElement) {
      this.silentAudioElement.pause();
    }

    if (this.activeMediaElement) {
      this.activeMediaElement.pause();
    }

    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (e) {}
    }

    this.sendCommandToIframe('pauseVideo');

    this.releaseWakeLock();
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seekTo(seconds: number) {
    const target = Math.max(0, Math.min(seconds, this.state.duration || 99999));
    this.state.currentTime = target;

    if (this.activeMediaElement) {
      this.activeMediaElement.currentTime = target;
    }

    if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(target, true);
      } catch (e) {}
    }

    this.sendCommandToIframe('seekTo', [target, true]);
    this.updateMediaSessionPosition();
    this.notify();
  }

  public seekRelative(deltaSeconds: number) {
    this.seekTo(this.state.currentTime + deltaSeconds);
  }

  public setVolume(level: number) {
    const vol = Math.max(0, Math.min(100, level));
    this.state.volume = vol;
    this.state.isMuted = vol === 0;

    if (this.activeMediaElement) {
      this.activeMediaElement.volume = vol / 100;
      this.activeMediaElement.muted = vol === 0;
    }

    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(vol);
        if (vol === 0) {
          this.ytPlayer.mute();
        } else {
          this.ytPlayer.unMute();
        }
      } catch (e) {}
    }

    this.sendCommandToIframe('setVolume', [vol]);
    if (vol === 0) {
      this.sendCommandToIframe('mute');
    } else {
      this.sendCommandToIframe('unMute');
    }

    this.notify();
  }

  public toggleMute() {
    if (this.state.isMuted) {
      this.state.isMuted = false;
      if (this.activeMediaElement) {
        this.activeMediaElement.muted = false;
      }
      if (this.ytPlayer && typeof this.ytPlayer.unMute === 'function') {
        try {
          this.ytPlayer.unMute();
          if (this.state.volume === 0) {
            this.setVolume(75);
          }
        } catch (e) {}
      }
      this.sendCommandToIframe('unMute');
    } else {
      this.state.isMuted = true;
      if (this.activeMediaElement) {
        this.activeMediaElement.muted = true;
      }
      if (this.ytPlayer && typeof this.ytPlayer.mute === 'function') {
        try {
          this.ytPlayer.mute();
        } catch (e) {}
      }
      this.sendCommandToIframe('mute');
    }
    this.notify();
  }

  public setBackgroundPlayEnabled(enabled: boolean) {
    this.state.isBackgroundPlayEnabled = enabled;
    try {
      localStorage.setItem('madrasah_bg_play_enabled', String(enabled));
    } catch (e) {}
    this.notify();
  }

  public setCapsuleVisible(visible: boolean) {
    this.state.isCapsuleVisible = visible;
    this.notify();
  }

  public setCapsuleExpanded(expanded: boolean) {
    this.state.isCapsuleExpanded = expanded;
    this.notify();
  }

  public toggleCapsuleExpanded() {
    this.state.isCapsuleExpanded = !this.state.isCapsuleExpanded;
    this.notify();
  }

  public closeTrack() {
    this.pause();
    this.state.currentTrack = null;
    this.state.isCapsuleVisible = false;
    this.state.isCapsuleExpanded = false;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.updateMediaSessionState('none');
    this.notify();
  }
}

export const backgroundMedia = BackgroundMediaManager.getInstance();
