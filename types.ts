export type NoteFont = 'sans' | 'serif' | 'mono';

export interface Note {
  id: string;
  topic: string;
  content: string;
  timestamp: number;
  font?: NoteFont;
}

export interface VideoResource {
  title: string;
  query: string; // Used to construct a search link if direct URL isn't perfect
  url?: string;
}

export interface WebResource {
  title: string;
  url: string;
  source: string;
}

export interface VerifiedResult {
  summary: string;
  detailedExplanation: string;
  reliabilityScore: number;
  sources: WebResource[];
  recommendedVideos: VideoResource[];
  consensusNote: string; // Explains how models agreed/disagreed
  mode?: 'quick' | 'deep'; // Track which mode generated this result
}

export enum TimerMode {
  FOCUS = 'FOCUS',
  BREAK = 'BREAK'
}

// -- Types for the Advanced Backend Method (Internal use for parsing) --
export interface AdvancedVerifiedResult {
  topic: string;
  rawResponses: {
    beginner: string;
    technical: string;
    keypoints: string;
    stepbystep: string;
  };
  analysis: {
    common: string[];
    conflicts: string[];
    consistencyScore: number; // 0-1
  };
  verifiedAnswer: string;
  webLinks: { title: string; url: string }[];
  youtubeLinks: { title: string; url: string }[];
}