import { useState, useEffect, useRef, useCallback } from 'react';
/**
 * useFullscreen Hook
 * * A comprehensive hook for managing fullscreen functionality with:
 * - Browser compatibility handling
 * - State persistence
 * - Event listeners and cleanup
 * - Error handling
 * - Performance optimizations
 */
function useFullscreen(options = {}) {
  const {
    targetRef,
    onFullscreenChange,
    persistState = true,
    autoRestore = false,
  } = options;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  // Check fullscreen API support
  useEffect(() => {
    const hasSupport = !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
    setIsSupported(hasSupport);
    if (!hasSupport) {
      setError('Fullscreen API is not supported in this browser');
      return;
    }
    // Restore persisted state if enabled
    if (persistState) {
      const savedState = localStorage.getItem('fullscreen-state');
      if (savedState === 'true' && autoRestore) {
        // Auto-restore fullscreen on mount (use with caution)
        requestFullscreen();
      } else if (savedState) {
        setIsFullscreen(savedState === 'true');
      }
    }
  }, [persistState, autoRestore]);
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const currentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(currentlyFullscreen);
      setError(null);
      // Persist state if enabled
      if (persistState) {
        localStorage.setItem(
          'fullscreen-state',
          currentlyFullscreen.toString()
        );
      }
      // Notify parent component
      if (onFullscreenChange) {
        onFullscreenChange(currentlyFullscreen);
      }
      // Clear any pending error timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    const handleFullscreenError = (event) => {
      console.error('Fullscreen error:', event);
      setError('Failed to enter fullscreen mode');
      // Clear error after 3 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setError(null);
      }, 3000);
    };
    // Add event listeners for all browser prefixes
    const changeEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];
    const errorEvents = [
      'fullscreenerror',
      'webkitfullscreenerror',
      'mozfullscreenerror',
      'MSFullscreenError',
    ];
    changeEvents.forEach((event) => {
      document.addEventListener(event, handleFullscreenChange);
    });
    errorEvents.forEach((event) => {
      document.addEventListener(event, handleFullscreenError);
    });
    return () => {
      changeEvents.forEach((event) => {
        document.removeEventListener(event, handleFullscreenChange);
      });
      errorEvents.forEach((event) => {
        document.removeEventListener(event, handleFullscreenError);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [persistState, onFullscreenChange]);
  // Get the correct fullscreen API methods
  const getFullscreenAPI = useCallback(() => {
    const element = targetRef?.current;
    if (!element) return null;
    return {
      requestFullscreen: (
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.webkitRequestFullScreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen
      )?.bind(element),
      exitFullscreen: (
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.webkitCancelFullScreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen
      )?.bind(document),
    };
  }, [targetRef]);
  // Enter fullscreen mode
  const requestFullscreen = useCallback(async () => {
    if (!isSupported) {
      setError('Fullscreen API is not supported');
      return false;
    }
    const fullscreenAPI = getFullscreenAPI();
    if (!fullscreenAPI?.requestFullscreen) {
      setError('Request fullscreen method not available');
      return false;
    }
    try {
      await fullscreenAPI.requestFullscreen();
      return true;
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      setError(err.message || 'Failed to enter fullscreen');
      return false;
    }
  }, [isSupported, getFullscreenAPI]);
  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) {
      setError('Fullscreen API is not supported');
      return false;
    }
    const fullscreenAPI = getFullscreenAPI();
    if (!fullscreenAPI?.exitFullscreen) {
      setError('Exit fullscreen method not available');
      return false;
    }
    try {
      await fullscreenAPI.exitFullscreen();
      return true;
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
      setError(err.message || 'Failed to exit fullscreen');
      return false;
    }
  }, [isSupported, getFullscreenAPI]);
  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      return await exitFullscreen();
    } else {
      return await requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);
  // Check if currently fullscreen
  const isCurrentlyFullscreen = useCallback(() => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }, []);
  return {
    isFullscreen,
    isSupported,
    error,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isCurrentlyFullscreen,
  };
}
export default useFullscreen;
