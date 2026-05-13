export type EventType =
  | 'TACKLE'
  | 'RUCK'
  | 'LINEOUT'
  | 'SCRUM'
  | 'PENALTY'
  | 'TRY'
  | 'CONVERSION'
  | 'KNOCK_ON';

export type TeamSide = 'home' | 'away';

export interface EventConfig {
  label: string;
  color: string;
  hotkey: string;
  outcomes?: string[];
}

export const EVENT_CONFIG: Record<EventType, EventConfig> = {
  TACKLE:     { label: 'Tackle',   color: '#60a5fa', hotkey: 'T' },
  RUCK:       { label: 'Ruck',     color: '#fb923c', hotkey: 'R' },
  LINEOUT:    { label: 'Lineout',  color: '#c084fc', hotkey: 'L', outcomes: ['won','lost','stolen'] },
  SCRUM:      { label: 'Scrum',    color: '#f472b6', hotkey: 'S', outcomes: ['won','lost','penalty','turnover'] },
  PENALTY:    { label: 'Penalty',  color: '#fbbf24', hotkey: 'P' },
  TRY:        { label: 'Try',      color: '#4ade80', hotkey: 'Y' },
  CONVERSION: { label: 'Conv',     color: '#a3e635', hotkey: 'C', outcomes: ['scored','missed'] },
  KNOCK_ON:   { label: 'Knock On', color: '#fb7185', hotkey: 'K' },
};

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: 'starter' | 'pro' | 'club';
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  org_id: string;
  home_team: string;
  away_team: string;
  home_color: string;
  away_color: string;
  match_date?: string;
  competition?: string;
  venue?: string;
  video_url?: string;
  video_public_url?: string;
  video_duration?: number;
  status: 'pending' | 'coding' | 'complete';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type: EventType;
  timestamp_secs: number;
  team: TeamSide;
  outcome?: string;
  player_name?: string;
  notes?: string;
  ai_detected: boolean;
  ai_confidence?: number;
  ai_description?: string;
  accepted?: boolean;
  created_by?: string;
  created_at: string;
}

export interface TeamInfo {
  id: TeamSide;
  name: string;
  color: string;
  abbr: string;
}

export interface TeamStats {
  tries: number;
  penalties: number;
  knockOns: number;
  tackles: number;
  rucks: number;
  lineoutsWon: number;
  lineoutsLost: number;
  lineoutsTotal: number;
  lineoutPct: number;
  scrumsWon: number;
  scrumsLost: number;
  scrumsTotal: number;
  scrumPct: number;
  score: number;
}

export interface MatchStats {
  home: TeamStats;
  away: TeamStats;
  ballInPlaySeconds: number;
  ballInPlayPct: number;
  totalEvents: number;
}

export interface AISuggestion {
  id: string;
  timestamp_secs: number;
  event_type: EventType;
  confidence: number;
  description?: string;
  status: 'pending' | 'accepted' | 'dismissed';
  team?: TeamSide;
}

export interface AIAnalysisResult {
  event_detected: boolean;
  event_type: EventType | 'NONE';
  confidence: number;
  description: string;
}

export interface CreateEventPayload {
  match_id: string;
  event_type: EventType;
  timestamp_secs: number;
  team: TeamSide;
  outcome?: string;
  ai_detected?: boolean;
  ai_confidence?: number;
  ai_description?: string;
  accepted?: boolean;
}