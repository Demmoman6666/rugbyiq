import type { MatchEvent, MatchStats, TeamStats } from './types'

export function computeMatchStats(events: MatchEvent[], matchDuration = 4800): MatchStats {
  const computeTeam = (side: 'home' | 'away'): TeamStats => {
    const ev = (type: string) => events.filter(e => e.event_type === type && e.team === side)
    const tries = ev('TRY').length
    const convScored = events.filter(e => e.event_type === 'CONVERSION' && e.team === side && e.outcome === 'scored').length
    const loWon  = events.filter(e => e.event_type === 'LINEOUT' && e.team === side && e.outcome === 'won').length
    const loLost = events.filter(e => e.event_type === 'LINEOUT' && e.team === side && (e.outcome === 'lost' || e.outcome === 'stolen')).length
    const loTotal = loWon + loLost
    const scWon  = events.filter(e => e.event_type === 'SCRUM' && e.team === side && e.outcome === 'won').length
    const scLost = events.filter(e => e.event_type === 'SCRUM' && e.team === side && e.outcome !== 'won').length
    const scTotal = scWon + scLost
    return {
      tries,
      penalties:      ev('PENALTY').length,
      knockOns:       ev('KNOCK_ON').length,
      tackles:        ev('TACKLE').length,
      rucks:          ev('RUCK').length,
      lineoutsWon:    loWon,
      lineoutsLost:   loLost,
      lineoutsTotal:  loTotal,
      lineoutPct:     loTotal ? Math.round((loWon / loTotal) * 100) : 0,
      scrumsWon:      scWon,
      scrumsLost:     scLost,
      scrumsTotal:    scTotal,
      scrumPct:       scTotal ? Math.round((scWon / scTotal) * 100) : 0,
      score:          tries * 5 + convScored * 2,
    }
  }
  const liveEvents = events.filter(e => ['TACKLE','RUCK'].includes(e.event_type)).length
  const bip = Math.min(liveEvents * 44, Math.round(matchDuration * 0.55))
  return {
    home: computeTeam('home'),
    away: computeTeam('away'),
    ballInPlaySeconds: bip,
    ballInPlayPct: Math.round((bip / matchDuration) * 100),
    totalEvents: events.length,
  }
}

export function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}