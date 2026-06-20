import type { CSSProperties } from 'react';
import { TEXT, COLOR } from './design.ts';

interface LabelProps {
  children: string;
  style?: CSSProperties;
}

export function Label({ children, style }: LabelProps) {
  return <div style={{ ...TEXT.label, color: COLOR.mute, ...style }}>{children}</div>;
}
