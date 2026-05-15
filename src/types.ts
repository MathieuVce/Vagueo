import type { Timestamp } from 'firebase/firestore';

export interface Stand {
  current_wave: number;
  queue_counter: number;
  secure_color: string; // computed from current_wave, not stored in Firestore
  is_paused: boolean;
  is_open: boolean;
  flow_rate: number;
  flow_slow: number;
  flow_sprint: number;
  min_per_person: number;
  name: string;
  logo_url: string;
  address?: string;
  max_queue_size?: number | null;  // null = unlimited
  max_delayed?: number | null;     // max simultaneous delayed clients (null = unlimited)
  vendor_uid?: string;
  vendor_email?: string;
  createdAt?: Timestamp;
  rating_count?: number;
  rating_sum?: number;
}

export type QueueStatus = 'waiting' | 'orange' | 'claimed' | 'done';

export interface QueueEntry {
  uid: string;
  stand_id: string;
  queue_position: number;
  status: QueueStatus;
  has_confirmed_presence: boolean;
  delay_used: boolean;
  timestamp: Timestamp | null;
  called_at?: Timestamp;
  claimed_at?: Timestamp;
  _dev?: boolean;
}

export type ExitReason =
  | 'completed'
  | 'left_waiting'
  | 'left_checkin'
  | 'timeout_checkin'
  | 'timeout_service'
  | 'left_voluntarily';

export interface HistoryEntry {
  uid: string;
  exit_reason: ExitReason;
  joined_at: Timestamp | null;
  called_at: Timestamp | null;
  claimed_at: Timestamp | null;
  done_at: Timestamp;
  delay_used: boolean;
  wait_ms?: number;
  service_ms?: number;
  rating?: number;
  feedback?: string;
}
