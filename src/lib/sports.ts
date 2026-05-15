export type Sport = 'rugby' | 'football' | 'netball' | 'basketball' | 'hockey' | 'cricket'

export interface SportEventConfig {
  label: string
  color: string
  hotkey: string
  outcomes?: string[]
}

export interface SportConfig {
  name: string
  icon: string
  events: Record<string, SportEventConfig>
}

export const SPORT_CONFIGS: Record<Sport, SportConfig> = {
  rugby: {
    name: 'Rugby Union',
    icon: '🏉',
    events: {
      TACKLE:     { label: 'Tackle',   color: '#60a5fa', hotkey: 'T' },
      RUCK:       { label: 'Ruck',     color: '#fb923c', hotkey: 'R' },
      LINEOUT:    { label: 'Lineout',  color: '#c084fc', hotkey: 'L', outcomes: ['won','lost','stolen'] },
      SCRUM:      { label: 'Scrum',    color: '#f472b6', hotkey: 'S', outcomes: ['won','lost','penalty','turnover'] },
      PENALTY:    { label: 'Penalty',  color: '#fbbf24', hotkey: 'P' },
      TRY:        { label: 'Try',      color: '#4ade80', hotkey: 'Y' },
      CONVERSION: { label: 'Conv',     color: '#a3e635', hotkey: 'C', outcomes: ['scored','missed'] },
      KNOCK_ON:   { label: 'Knock On', color: '#fb7185', hotkey: 'K' },
      KICK:       { label: 'Kick',     color: '#38bdf8', hotkey: 'X', outcomes: ['retained','lost','touch'] },
    }
  },
  football: {
    name: 'Football',
    icon: '⚽',
    events: {
      SHOT:        { label: 'Shot',        color: '#4ade80', hotkey: 'S', outcomes: ['on target','off target','blocked'] },
      GOAL:        { label: 'Goal',        color: '#22c55e', hotkey: 'G' },
      CORNER:      { label: 'Corner',      color: '#60a5fa', hotkey: 'C', outcomes: ['won','lost'] },
      FREE_KICK:   { label: 'Free Kick',   color: '#fbbf24', hotkey: 'F' },
      FOUL:        { label: 'Foul',        color: '#fb923c', hotkey: 'O' },
      YELLOW_CARD: { label: 'Yellow Card', color: '#eab308', hotkey: 'Y' },
      RED_CARD:    { label: 'Red Card',    color: '#ef4444', hotkey: 'R' },
      OFFSIDE:     { label: 'Offside',     color: '#f472b6', hotkey: 'X' },
      SAVE:        { label: 'Save',        color: '#c084fc', hotkey: 'V' },
      TACKLE:      { label: 'Tackle',      color: '#38bdf8', hotkey: 'T', outcomes: ['won','lost'] },
    }
  },
  netball: {
    name: 'Netball',
    icon: '🏐',
    events: {
      GOAL:        { label: 'Goal',        color: '#4ade80', hotkey: 'G' },
      MISS:        { label: 'Miss',        color: '#fb7185', hotkey: 'M' },
      TURNOVER:    { label: 'Turnover',    color: '#fb923c', hotkey: 'T', outcomes: ['intercept','out of court','contact','obstruction'] },
      PENALTY:     { label: 'Penalty',     color: '#fbbf24', hotkey: 'P' },
      CENTRE_PASS: { label: 'Centre Pass', color: '#60a5fa', hotkey: 'C', outcomes: ['won','lost'] },
      INTERCEPT:   { label: 'Intercept',   color: '#c084fc', hotkey: 'I' },
      TIP_OFF:     { label: 'Tip Off',     color: '#38bdf8', hotkey: 'O', outcomes: ['won','lost'] },
    }
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    events: {
      TWO_PT:      { label: '2pt',         color: '#4ade80', hotkey: 'T', outcomes: ['scored','missed'] },
      THREE_PT:    { label: '3pt',         color: '#22c55e', hotkey: 'H', outcomes: ['scored','missed'] },
      FREE_THROW:  { label: 'Free Throw',  color: '#a3e635', hotkey: 'F', outcomes: ['scored','missed'] },
      TURNOVER:    { label: 'Turnover',    color: '#fb923c', hotkey: 'O' },
      FOUL:        { label: 'Foul',        color: '#fbbf24', hotkey: 'U' },
      BLOCK:       { label: 'Block',       color: '#60a5fa', hotkey: 'B' },
      STEAL:       { label: 'Steal',       color: '#c084fc', hotkey: 'S' },
      REBOUND:     { label: 'Rebound',     color: '#38bdf8', hotkey: 'R', outcomes: ['offensive','defensive'] },
    }
  },
  hockey: {
    name: 'Hockey',
    icon: '🏑',
    events: {
      GOAL:           { label: 'Goal',           color: '#4ade80', hotkey: 'G' },
      SHOT:           { label: 'Shot',           color: '#22c55e', hotkey: 'S', outcomes: ['on target','off target'] },
      PENALTY_CORNER: { label: 'Pen Corner',     color: '#fbbf24', hotkey: 'P', outcomes: ['goal','saved','missed'] },
      SHORT_CORNER:   { label: 'Short Corner',   color: '#fb923c', hotkey: 'O' },
      FOUL:           { label: 'Foul',           color: '#fb7185', hotkey: 'F' },
      CARD:           { label: 'Card',           color: '#eab308', hotkey: 'C', outcomes: ['green','yellow','red'] },
      TACKLE:         { label: 'Tackle',         color: '#60a5fa', hotkey: 'T', outcomes: ['won','lost'] },
      CIRCLE_ENTRY:   { label: 'Circle Entry',   color: '#c084fc', hotkey: 'E' },
    }
  },
  cricket: {
    name: 'Cricket',
    icon: '🏏',
    events: {
      WICKET:    { label: 'Wicket',    color: '#ef4444', hotkey: 'W', outcomes: ['bowled','caught','lbw','run out','stumped'] },
      FOUR:      { label: 'Four',      color: '#4ade80', hotkey: 'F' },
      SIX:       { label: 'Six',       color: '#22c55e', hotkey: 'X' },
      WIDE:      { label: 'Wide',      color: '#fbbf24', hotkey: 'D' },
      NO_BALL:   { label: 'No Ball',   color: '#fb923c', hotkey: 'N' },
      DOT_BALL:  { label: 'Dot Ball',  color: '#60a5fa', hotkey: 'O' },
      CATCH:     { label: 'Catch',     color: '#c084fc', hotkey: 'C', outcomes: ['taken','dropped'] },
      BOUNDARY:  { label: 'Boundary',  color: '#38bdf8', hotkey: 'B' },
    }
  }
}

export const SPORTS_LIST: { id: Sport; name: string; icon: string }[] = [
  { id: 'rugby',      name: 'Rugby Union', icon: '🏉' },
  { id: 'football',   name: 'Football',    icon: '⚽' },
  { id: 'netball',    name: 'Netball',     icon: '🏐' },
  { id: 'basketball', name: 'Basketball',  icon: '🏀' },
  { id: 'hockey',     name: 'Hockey',      icon: '🏑' },
  { id: 'cricket',    name: 'Cricket',     icon: '🏏' },
]

export function getSportConfig(sport: string): SportConfig {
  return SPORT_CONFIGS[sport as Sport] ?? SPORT_CONFIGS.rugby
}
