import { toDateOnlyString } from "@/lib/birthdays";
import { INITIAL_MEMBERS } from "@/lib/members-data";

export type GoalResult = "open" | "hit" | "missed";

export interface Goal {
  id: string;
  memberId: string;
  memberName?: string;
  memberEmail?: string | null;
  goalText: string;
  horizon: number;
  setDate: string;
  targetDate: string;
  result: GoalResult;
  month?: string;
}

export interface GoalMemberRef {
  id: string;
  name?: string | null;
  email?: string | null;
}

export function parseGoalResult(value: unknown): GoalResult {
  switch (value) {
    case "open":
    case "hit":
    case "missed":
      return value;
    default:
      return "open";
  }
}

export function isOpenGoal(goal: Goal): boolean {
  switch (goal.result) {
    case "open":
      return true;
    case "hit":
    case "missed":
      return false;
    default: {
      const _exhaustive: never = goal.result;
      return _exhaustive;
    }
  }
}

export function compareGoals(a: Goal, b: Goal): number {
  return a.horizon - b.horizon || a.targetDate.localeCompare(b.targetDate);
}

export function monthFromSetDate(horizon: number, setDate: string): string | undefined {
  if (horizon !== 1 || !setDate) {
    return undefined;
  }
  const date = new Date(`${setDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString("en-US", { month: "long" });
}

export function goalOverrideKeys(goal: Pick<Goal, "id" | "memberName" | "memberEmail" | "goalText" | "setDate" | "horizon">): string[] {
  const text = goal.goalText.trim().toLowerCase();
  const base = `${text}|${goal.setDate}|${goal.horizon}`;
  const keys = [goal.id, base];
  if (goal.memberEmail) {
    keys.push(`${goal.memberEmail.toLowerCase()}|${base}`);
  }
  if (goal.memberName) {
    keys.push(`${goal.memberName.trim().toLowerCase()}|${base}`);
  }
  return keys;
}

export function lookupGoalResultOverride(
  goal: Pick<Goal, "id" | "memberName" | "memberEmail" | "goalText" | "setDate" | "horizon">,
  overrides: Record<string, GoalResult>
): GoalResult | undefined {
  for (const key of goalOverrideKeys(goal)) {
    const override = overrides[key];
    if (override) {
      return override;
    }
  }
  return undefined;
}

export function goalBelongsToMember(goal: Goal, member: GoalMemberRef): boolean {
  if (goal.memberId && member.id && goal.memberId === member.id) {
    return true;
  }
  if (goal.memberEmail && member.email && goal.memberEmail.toLowerCase() === member.email.toLowerCase()) {
    return true;
  }
  if (goal.memberName && member.name && goal.memberName === member.name) {
    return true;
  }
  return false;
}

export function isMyGoal(
  goal: Goal,
  currentMember: GoalMemberRef | null,
  userEmails: string[],
  fullName?: string | null
): boolean {
  if (currentMember && goalBelongsToMember(goal, currentMember)) {
    return true;
  }
  if (goal.memberEmail && userEmails.includes(goal.memberEmail.toLowerCase())) {
    return true;
  }
  if (fullName && goal.memberName === fullName) {
    return true;
  }
  return false;
}

export function filterMyOpenGoals(
  goals: Goal[],
  currentMember: GoalMemberRef | null,
  userEmails: string[],
  fullName?: string | null
): Goal[] {
  return goals
    .filter((goal) => isOpenGoal(goal) && isMyGoal(goal, currentMember, userEmails, fullName))
    .sort(compareGoals);
}

export function applyGoalResultOverrides(
  goals: Goal[],
  overrides: Record<string, GoalResult>
): Goal[] {
  return goals.map((goal) => {
    const override = lookupGoalResultOverride(goal, overrides);
    return override ? { ...goal, result: override } : goal;
  });
}

export function recordGoalResultOverride(
  overrides: Record<string, GoalResult>,
  goal: Goal,
  result: GoalResult
): Record<string, GoalResult> {
  const next = { ...overrides };
  for (const key of goalOverrideKeys(goal)) {
    next[key] = result;
  }
  return next;
}

export function normalizeGoal(raw: {
  id: string;
  memberId: string;
  memberName?: string | null;
  memberEmail?: string | null;
  goalText: string;
  horizon: number;
  setDate: unknown;
  targetDate: unknown;
  result?: unknown;
  month?: string | null;
}): Goal {
  const setDate = toDateOnlyString(raw.setDate) ?? String(raw.setDate ?? "");
  const targetDate = toDateOnlyString(raw.targetDate) ?? String(raw.targetDate ?? "");
  const result = parseGoalResult(raw.result);
  return {
    id: raw.id,
    memberId: raw.memberId,
    memberName: raw.memberName ?? undefined,
    memberEmail: raw.memberEmail ?? undefined,
    goalText: raw.goalText,
    horizon: Number(raw.horizon),
    setDate,
    targetDate,
    result,
    month: raw.month ?? monthFromSetDate(Number(raw.horizon), setDate),
  };
}

export function partitionGoals(goals: Goal[]): { active: Goal[]; completed: Goal[] } {
  const active: Goal[] = [];
  const completed: Goal[] = [];

  for (const goal of goals) {
    if (isOpenGoal(goal)) {
      active.push(goal);
    } else {
      completed.push(goal);
    }
  }

  return {
    active: active.sort(compareGoals),
    completed: completed.sort(compareGoals),
  };
}

const SEEDED_GOALS_WITHOUT_EMAIL: Goal[] = [







];

const memberEmailById = new Map(
  INITIAL_MEMBERS.map((member) => [member.id, member.email])
);

export const SEEDED_GOALS: Goal[] = SEEDED_GOALS_WITHOUT_EMAIL.map((goal) => ({
  ...goal,
  memberEmail: goal.memberEmail ?? memberEmailById.get(goal.memberId) ?? undefined,
}));
