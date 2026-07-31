import { useState, useEffect, useCallback } from 'react';

/**
 * Modern useFullscreen Hook
 * Uses standard HTML5 Fullscreen API.
 */
function useFullscreen(options = {}) {
  const { targetRef, onFullscreenChange } = options;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSupported = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (onFullscreenChange) {
        onFullscreenChange(active);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  const requestFullscreen = useCallback(async () => {
    const element = targetRef?.current || document.documentElement;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return true;
      } catch (err) {
        console.error('Fullscreen error:', err);
        return false;
      }
    }
    return false;
  }, [targetRef]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
        return true;
      } catch (err) {
        console.error('Exit fullscreen error:', err);
        return false;
      }
    }
    return false;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      return await exitFullscreen();
    } else {
      return await requestFullscreen();
    }
  }, [requestFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    error: null,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isCurrentlyFullscreen: () => !!document.fullscreenElement,
  };
}

export default useFullscreen;

