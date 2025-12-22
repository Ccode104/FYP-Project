import { useState, useCallback, useEffect } from 'react';

interface UseCameraReturn {
  isVideoOff: boolean;
  isEnabled: boolean;
  currentDevice: string | null;
  availableDevices: MediaDeviceInfo[];
  switchCamera: (deviceId?: string) => Promise<void>;
  toggleVideo: () => void;
  error: string | null;
}

export const useCamera = (stream?: MediaStream | null): UseCameraReturn => {
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      return videoDevices;
    } catch (err: unknown) {
      console.error('Failed to get video devices:', err);
      setError('Failed to enumerate video devices');
      return [];
    }
  }, []);

  // Initialize devices on mount
  useEffect(() => {
    getVideoDevices();
  }, [getVideoDevices]);

  // Update state when stream changes
  useEffect(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        setIsEnabled(true);
        setIsVideoOff(!videoTracks[0].enabled);
        setCurrentDevice(videoTracks[0].getSettings().deviceId || null);
      }
    } else {
      setIsEnabled(false);
      setIsVideoOff(true);
      setCurrentDevice(null);
    }
  }, [stream]);

  const switchCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);

      // If no deviceId provided, use the next available device
      let targetDeviceId = deviceId;
      if (!targetDeviceId && availableDevices.length > 1) {
        const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDevice);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        targetDeviceId = availableDevices[nextIndex].deviceId;
      }

      if (!targetDeviceId) {
        throw new Error('No camera device available');
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Replace video track in existing stream
      if (stream) {
        const oldVideoTrack = stream.getVideoTracks()[0];
        if (oldVideoTrack) {
          stream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        stream.addTrack(newStream.getVideoTracks()[0]);
      }

      setCurrentDevice(targetDeviceId);

    } catch (err: unknown) {
      console.error('Failed to switch camera:', err);
      setError(err.message || 'Failed to switch camera');
      throw err;
    }
  }, [stream, availableDevices, currentDevice]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!videoTracks[0]?.enabled);
    }
  }, [stream]);

  return {
    isVideoOff,
    isEnabled,
    currentDevice,
    availableDevices,
    switchCamera,
    toggleVideo,
    error,
  };
};
