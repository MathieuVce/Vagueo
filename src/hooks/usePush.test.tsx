import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { usePush } from './usePush';

describe('usePush', () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Notification
    (window as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    // Mock Navigator
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          showNotification: vi.fn(),
        }),
      },
      configurable: true,
    });
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterAll(() => {
    (window as any).Notification = originalNotification;
  });

  it('requests permission and updates ref', async () => {
    const { result } = renderHook(() => usePush());
    let permitted: boolean = false;
    await act(async () => {
      permitted = await result.current.requestPermission();
    });
    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(permitted).toBe(true);
  });

  it('notifies when permitted', async () => {
    const { result } = renderHook(() => usePush());
    
    // First, we must request permission to update the internal ref
    await act(async () => {
      await result.current.requestPermission();
    });
    
    await act(async () => {
      await result.current.notify('Title', 'Body');
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200]);
    const reg = await navigator.serviceWorker.ready;
    expect(reg.showNotification).toHaveBeenCalledWith('Title', expect.objectContaining({
      body: 'Body',
    }));
  });
});
