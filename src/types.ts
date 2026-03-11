export type Language = 'pt' | 'en';

export type Category = 'Economic' | 'Political' | 'Military';

export type HelpType = 'social' | 'advisors' | 'leader';

export interface Country {
  id: string;
  name: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  options: ScenarioOption[];
  category: Category;
}

export interface ScenarioOption {
  id: string;
  text: string;
  action: string;
}

export interface Evaluation {
  isGood: boolean;
  scoreChange: number;
  feedback: string;
  justification: string;
}

export interface Interaction {
  country: Country;
  category: Category;
  scenarioTitle: string;
  choice: string;
  isGood: boolean;
  scoreChange: number;
}

export interface GameAnalysis {
  summary: string;
  impact: string;
  historicalLeader: string;
  leaderReasoning: string;
}

export interface GameState {
  playerCountry: Country | null;
  selectedCountry: Country | null;
  score: number;
  history: Interaction[];
  language: Language;
  currentScenario: Scenario | null;
  isEvaluating: boolean;
  lastEvaluation: Evaluation | null;
  showIntro: boolean;
  pendingOption: string | null;
  autoRandomCountry: boolean;
  isGameOver: boolean;
  gameAnalysis: GameAnalysis | null;
  turnCount: number;
  usedHelpTools: HelpType[];
  helpUsedThisTurn: boolean;
  currentHelpResponse: string | null;
  currentRandomLeader: string | null;
}

export interface CountryComparison {
  compatibilities: string[];
  incompatibilities: string[];
  summary: string;
}

export interface FunModeState {
  active: boolean;
  countryA: Country | null;
  countryB: Country | null;
  comparison: CountryComparison | null;
  isLoading: boolean;
}
