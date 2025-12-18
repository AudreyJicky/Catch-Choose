
export interface Doll {
  id: string;
  name: string;
  color: string;
  emoji: string;
  isLiked: boolean;
}

export type GameStatus = 'IDLE' | 'COUNTDOWN' | 'MOVING' | 'DROPPING' | 'RETURNING' | 'WIN';

export interface AnnouncerMessage {
  text: string;
  type: 'neutral' | 'excited' | 'sad';
}

export interface CatchRecord {
  id: string;
  dollName: string;
  emoji: string;
  timestamp: string;
}
