export interface TeamInfo {
  id: 'home' | 'away'
  name: string
  color: string
  abbr: string
}

export interface Match {
  id: string
  org_id: string
  home_team: string
  away_team: string
  home_color: string
  away_color: string
  match_date?: string
  competition?: string
  venue?: string
  status: 'pending' | 'coding' | 'complete'
  video_url?: string
  video_public_url?: string
  video_duration?: number
  thumbnail_url?: string
  created_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  event_type: string
  timestamp_secs: number
  team: 'home' | 'away'
  outcome?: string
  notes?: string
  ai_detected?: boolean
  ai_confidence?: number
  ai_description?: string
  accepted?: boolean
  player_id?: string
  player_name?: string
  shirt_number?: number
}

export interface AISuggestion {
  id: string
  timestamp_secs: number
  event_type: string
  confidence: number
  description?: string
  status: 'pending' | 'accepted' | 'dismissed'
  team?: 'home' | 'away'
}

export interface Player {
  id: string
  match_id: string
  team: 'home' | 'away'
  shirt_number: number
  name: string
}

export interface ParsedPlayer {
  shirt_number: number
  name: string
}

export interface AIAnalysisResult {
  event_detected: boolean
  event_type: string
  confidence: number
  description?: string
  timestamp_seconds?: number
  events: {
    event_type: string
    timestamp_seconds: number
    confidence: number
    description?: string
  }[]
}

export type EventType = string

export interface TeamStats {
  score: number
  tries: number
  penalties: number
  knockOns: number
  tackles: number
  rucks: number
  lineoutsWon: number
  lineoutsLost: number
  lineoutsTotal: number
  lineoutPct: number
  scrumsWon: number
  scrumsLost: number
  scrumsTotal: number
  scrumPct: number
}

export interface MatchStats {
  home: TeamStats
  away: TeamStats
  ballInPlaySeconds: number
  ballInPlayPct: number
  totalEvents: number
}
