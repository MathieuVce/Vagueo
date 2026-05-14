import { useRef, useCallback } from 'react';

interface UsePushReturn {
  requestPermission: () => Promise<boolean>;
  notify: (title: string, body: string) => Promise<void>;
}

export function usePush(): UsePushReturn {
  const permitted = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (permitted.current === 'granted') return true;
    const result = await Notification.requestPermission();
    permitted.current = result;
    return result === 'granted';
  }, []);

  const notify = useCallback(async (title: string, body: string): Promise<void> => {
    if (permitted.current !== 'granted') return;
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'vagueo-turn',
        renotify: true,
        vibrate: [200, 100, 200],
      });
    } catch {
      // Falls back silently (dev HTTP, unsupported browser)
    }
  }, []);

  return { requestPermission, notify };
}
