import type { Timestamp } from 'firebase/firestore';

export interface Stand {
  current_wave: number; // vague en cours de passage (avancée auto par le vendeur)
  queue_counter: number; // legacy (modèle par position)
  fill_wave?: number; // vague en cours d'assemblage (où atterrissent les arrivants)
  fill_count?: number; // nombre de clients déjà dans fill_wave (plafond WAVE_SIZE)
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
  max_queue_size?: number | null; // null = unlimited
  max_delayed?: number | null; // max simultaneous delayed clients (null = unlimited)
  vendor_uid?: string;
  vendor_email?: string;
  createdAt?: Timestamp;
  rating_count?: number;
  rating_sum?: number;
  status?: 'active' | 'pending_approval';
  call_ahead_min?: number; // minutes before estimated turn to trigger orange (default 8)
  service_ms_ema?: number; // exponential moving average of actual service durations
  service_count?: number; // number of completed services (weights the EMA blend)
}

export type QueueStatus = 'waiting' | 'orange' | 'claimed' | 'done';

export interface QueueEntry {
  uid: string;
  stand_id: string;
  wave_number: number; // la vague du client (fixée à l'arrivée)
  queue_position?: number; // legacy (modèle par position)
  status: QueueStatus;
  has_confirmed_presence: boolean;
  delay_used: boolean;
  timestamp: Timestamp | null;
  called_at?: Timestamp;
  claimed_at?: Timestamp;
  last_seen?: Timestamp; // heartbeat : dernière fois que l'onglet du client était vivant
  _dev?: boolean;
}

export type ExitReason =
  | 'completed'
  | 'left_waiting'
  | 'left_checkin'
  | 'timeout_checkin'
  | 'timeout_service'
  | 'timeout_waiting'
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
