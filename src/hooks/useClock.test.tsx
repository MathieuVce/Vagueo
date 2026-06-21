import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useClock } from './useClock';

describe('useClock', () => {
  it('returns current time and updates every minute', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useClock());

    const initialTime = result.current;

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current).not.toBe(initialTime);
    vi.useRealTimers();
  });
});
