/** Competition mapping UI order: Regular → Elementary → Grandmaster. */
const COMPETITION_STREAM_SORT_ORDER: Readonly<Record<string, number>> = {
  Regular: 1,
  Elementary: 2,
  Grandmaster: 3,
};

export function competitionStreamSortOrder(stream: string): number {
  return COMPETITION_STREAM_SORT_ORDER[stream] ?? Number.MAX_SAFE_INTEGER;
}

/** Sort comparator for competition stream names. */
export function compareCompetitionStreams(a: string, b: string): number {
  const byOrder = competitionStreamSortOrder(a) - competitionStreamSortOrder(b);
  return byOrder !== 0 ? byOrder : a.localeCompare(b);
}

/** Parses "Level 3" → 3; unknown labels sort last. */
export function parseMappingLevelOrder(level: string): number {
  const match = level.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}
