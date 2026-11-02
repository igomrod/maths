import { GeneratedProblem, OperationType, ProblemAttempt, StoredProblem, ValidationResult } from '../types/problem';

const STORAGE_KEY = 'mates_magicas_problems_v1';
const ACCESS_CODE_KEY = 'mates_magicas_access_code_v1';

export function getSavedAccessCode(): string {
  try {
    return localStorage.getItem(ACCESS_CODE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAccessCode(code: string): void {
  try {
    localStorage.setItem(ACCESS_CODE_KEY, code.trim());
  } catch {
    // ignore storage errors
  }
}

export function clearAccessCode(): void {
  try {
    localStorage.removeItem(ACCESS_CODE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSpanishDateHeader(dateKey: string): string {
  const todayKey = getLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const [year, month, day] = dateKey.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const formatted = dateObj.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  if (dateKey === todayKey) {
    return `Hoy (${formatted})`;
  }
  if (dateKey === yesterdayKey) {
    return `Ayer (${formatted})`;
  }
  return formatted;
}

export function loadStoredProblems(): StoredProblem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Error loading problems from localStorage:', err);
    return [];
  }
}

export function saveStoredProblems(problems: StoredProblem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
  } catch (err) {
    console.error('Error saving problems to localStorage:', err);
  }
}

export function addGeneratedProblem(
  problem: GeneratedProblem,
  operations: OperationType[],
  customDate?: Date
): StoredProblem {
  const now = customDate || new Date();
  const newEntry: StoredProblem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prob_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now.toISOString(),
    dateKey: getLocalDateKey(now),
    operations,
    problem,
    status: 'pending',
    attempts: [],
  };

  const existing = loadStoredProblems();
  const updated = [newEntry, ...existing];
  saveStoredProblems(updated);
  return newEntry;
}

export function recordProblemAttempt(
  problemId: string,
  userAnswer: string,
  validation: ValidationResult
): StoredProblem[] {
  const existing = loadStoredProblems();
  const nowIso = new Date().toISOString();

  const attempt: ProblemAttempt = {
    id: `att_${Date.now()}`,
    userAnswer,
    timestamp: nowIso,
    validation,
  };

  const updated = existing.map((item) => {
    if (item.id !== problemId) return item;
    const isNowSolved = item.status === 'solved' || validation.isCorrect;
    return {
      ...item,
      status: isNowSolved ? ('solved' as const) : ('pending' as const),
      attempts: [...item.attempts, attempt],
      solvedAt: isNowSolved && !item.solvedAt ? nowIso : item.solvedAt,
      finalAnswer: validation.isCorrect ? userAnswer : item.finalAnswer,
    };
  });

  saveStoredProblems(updated);
  return updated;
}

/**
 * Deletes a problem ONLY if its status is 'pending'.
 * Solved problems are permanently protected and can never be deleted.
 */
export function deletePendingProblem(problemId: string): {
  deleted: boolean;
  reason?: string;
  problems: StoredProblem[];
} {
  const existing = loadStoredProblems();
  const target = existing.find((p) => p.id === problemId);

  if (!target) {
    return { deleted: false, reason: 'not_found', problems: existing };
  }

  if (target.status === 'solved') {
    // Hard protection: never delete solved problems
    return {
      deleted: false,
      reason: 'Los problemas resueltos no se pueden borrar para guardar tu progreso.',
      problems: existing,
    };
  }

  const updated = existing.filter((p) => p.id !== problemId);
  saveStoredProblems(updated);
  return { deleted: true, problems: updated };
}

export interface DateGroupedProblems {
  dateKey: string;
  label: string;
  problems: StoredProblem[];
  solvedCount: number;
  pendingCount: number;
}

export function groupProblemsByDate(problems: StoredProblem[]): DateGroupedProblems[] {
  const map = new Map<string, StoredProblem[]>();

  // Sort newest first
  const sorted = [...problems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const prob of sorted) {
    const key = prob.dateKey || getLocalDateKey(new Date(prob.createdAt));
    const list = map.get(key) || [];
    list.push(prob);
    map.set(key, list);
  }

  const groups: DateGroupedProblems[] = [];
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  for (const dateKey of sortedKeys) {
    const list = map.get(dateKey) || [];
    groups.push({
      dateKey,
      label: formatSpanishDateHeader(dateKey),
      problems: list,
      solvedCount: list.filter((p) => p.status === 'solved').length,
      pendingCount: list.filter((p) => p.status === 'pending').length,
    });
  }

  return groups;
}
