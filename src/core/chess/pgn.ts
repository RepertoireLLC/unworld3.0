import { ChessMoveDescriptor } from './engine';

export interface PGNMetadata {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: string;
  black: string;
  result: string;
  whiteElo?: number;
  blackElo?: number;
  timeControl?: string;
  variant?: string;
  termination?: string;
  additionalTags?: Record<string, string>;
}

function formatTag(name: string, value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return `[${name} "${String(value)}"]`;
}

export function buildPGN(metadata: PGNMetadata, moves: ChessMoveDescriptor[]): string {
  const now = new Date();
  const defaultDate = `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${String(now.getUTCDate()).padStart(2, '0')}`;
  const tags: Array<string> = [];
  const pushTag = (name: string, value: string | number | undefined) => {
    const entry = formatTag(name, value);
    if (entry) {
      tags.push(entry);
    }
  };

  pushTag('Event', metadata.event ?? 'Harmonia Chess Encounter');
  pushTag('Site', metadata.site ?? 'Harmonia Mesh');
  pushTag('Date', metadata.date ?? defaultDate);
  pushTag('Round', metadata.round ?? '-');
  pushTag('White', metadata.white);
  pushTag('Black', metadata.black);
  pushTag('Result', metadata.result ?? '*');
  pushTag('WhiteElo', metadata.whiteElo);
  pushTag('BlackElo', metadata.blackElo);
  pushTag('TimeControl', metadata.timeControl ?? '-');
  pushTag('Variant', metadata.variant ?? 'Standard');
  pushTag('Termination', metadata.termination);

  if (metadata.additionalTags) {
    for (const [key, value] of Object.entries(metadata.additionalTags)) {
      pushTag(key, value);
    }
  }

  const moveText: string[] = [];
  let currentMoveNumber = 0;
  for (const move of moves) {
    if (move.color === 'white') {
      currentMoveNumber += 1;
      moveText.push(`${currentMoveNumber}. ${move.san}`);
    } else {
      if (currentMoveNumber === 0) {
        currentMoveNumber = move.moveNumber;
        moveText.push(`${currentMoveNumber}... ${move.san}`);
      } else {
        const lastIndex = moveText.length - 1;
        moveText[lastIndex] = `${moveText[lastIndex]} ${move.san}`;
      }
    }
  }

  const result = metadata.result ?? '*';
  moveText.push(result);

  return `${tags.join('\n')}\n\n${moveText.join(' ')}`;
}
