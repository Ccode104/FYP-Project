import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMicrophoneReturn {
  isMuted: boolean;
  isEnabled: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  error: string | null;
}

export const useMicrophone = (stream?: MediaStream | null): UseMicrophoneReturn => {
  const [isMuted, setIsMuted] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context when stream is available
  useEffect(() => {
    if (stream && stream.getAudioTracks().length > 0) {
      try {
        const audioContext = new (window.AudioContext || (window as unknown).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(gainNode);
        gainNode.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        gainNodeRef.current = gainNode;

        setIsEnabled(true);
        setError(null);
      } catch (err: unknown) {
        console.error('Failed to initialize audio context:', err);
        setError('Audio context initialization failed');
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream]);

  const toggleMute = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  }, [stream]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  // Update mute state when tracks change
  useEffect(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  }, [stream]);

  return {
    isMuted,
    isEnabled,
    volume,
    toggleMute,
    setVolume,
    error,
  };
};
