export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';

export type VisualType = 'grouped_items' | 'bar_model' | 'price_tag_shop' | 'grid_array';

export interface GroupedItemVisual {
  label: string;
  emoji: string;
  count: number;
}

export interface BarModelPart {
  label: string;
  value: string;
  color?: string;
}

export interface BarModelVisual {
  totalLabel: string;
  parts: BarModelPart[];
}

export interface ShopItemVisual {
  name: string;
  emoji: string;
  price: string;
}

export interface GridVisual {
  rows: number;
  cols: number;
  emoji: string;
  label: string;
}

export interface ProblemVisual {
  type: VisualType;
  caption: string;
  groups?: GroupedItemVisual[];
  barModel?: BarModelVisual;
  shopItems?: ShopItemVisual[];
  grid?: GridVisual;
}

export interface GeneratedProblem {
  title: string;
  story: string;
  question: string;
  hint: string;
  expectedAnswer: string;
  numericAnswer: number;
  unit: string;
  visual: ProblemVisual;
}

export interface ValidationResult {
  isCorrect: boolean;
  status: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  encouragement: string;
}

export interface ProblemAttempt {
  id: string;
  userAnswer: string;
  timestamp: string;
  validation: ValidationResult;
}

export interface StoredProblem {
  id: string;
  createdAt: string; // ISO string
  dateKey: string;   // YYYY-MM-DD in local time
  operations: OperationType[];
  problem: GeneratedProblem;
  status: 'pending' | 'solved';
  attempts: ProblemAttempt[];
  solvedAt?: string;
  finalAnswer?: string;
}
