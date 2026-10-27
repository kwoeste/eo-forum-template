"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { INITIAL_MEMBERS } from "@/lib/members-data";
import {
  applyGoalResultOverrides,
  normalizeGoal,
  parseGoalResult,
  recordGoalResultOverride,
  SEEDED_GOALS,
  type Goal,
  type GoalMemberRef,
  type GoalResult,
} from "@/lib/goals-data";

export interface MemberOption {
  id: string;
  name: string;
  email: string | null;
}

const GOAL_RESULT_STORAGE_KEY = "eo-forum-goal-results";

function readStoredOverrides(): Record<string, GoalResult> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(GOAL_RESULT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        const result = parseGoalResult(value);
        return value === result ? [[key, result]] : [];
      })
    );
  } catch {
    return {};
  }
}

function writeStoredOverrides(overrides: Record<string, GoalResult>) {
  window.localStorage.setItem(GOAL_RESULT_STORAGE_KEY, JSON.stringify(overrides));
}

function memberFromUser(
  emails: string[],
  fullName?: string | null
): GoalMemberRef | null {
  const byEmail = INITIAL_MEMBERS.find(
    (member) => member.email && emails.includes(member.email.toLowerCase())
  );
  if (byEmail) {
    return byEmail;
  }
  if (fullName) {
    const byName = INITIAL_MEMBERS.find((member) => member.name === fullName);
    if (byName) {
      return byName;
    }
    return { id: "", name: fullName, email: emails[0] ?? null };
  }
  return null;
}

export function useGoals() {
  const { user } = useUser();
  const userEmails = useMemo(
    () =>
      (user?.emailAddresses ?? []).map((email) => email.emailAddress.toLowerCase()),
    [user?.emailAddresses]
  );
  const userEmailsKey = userEmails.join(",");
  const fullName = user?.fullName ?? null;
  const fallbackMember = useMemo(
    () => memberFromUser(userEmails, fullName),
    [fullName, userEmails]
  );

  const [goals, setGoals] = useState<Goal[]>(SEEDED_GOALS);
  const [currentMember, setCurrentMember] = useState<GoalMemberRef | null>(null);
  const [members, setMembers] = useState<MemberOption[]>(
    INITIAL_MEMBERS.map((m) => ({ id: m.id, name: m.name, email: m.email }))
  );
  const [loading, setLoading] = useState(true);
  const overridesRef = useRef<Record<string, GoalResult>>({});

  useEffect(() => {
    const fallback = memberFromUser(
      userEmailsKey.split(",").filter(Boolean),
      fullName
    );
    overridesRef.current = readStoredOverrides();
    setGoals(applyGoalResultOverrides(SEEDED_GOALS, overridesRef.current));
    if (fallback) {
      setCurrentMember(fallback);
    }

    let cancelled = false;

    const loadGoals = async () => {
      try {
        const response = await fetch("/api/goals");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const apiGoals: Goal[] = Array.isArray(data.goals)
          ? data.goals.map((goal: Goal) => normalizeGoal(goal))
          : [];
        if (cancelled) {
          return;
        }
        if (apiGoals.length > 0) {
          const merged = applyGoalResultOverrides(apiGoals, overridesRef.current);
          setGoals(merged);
          for (const goal of merged) {
            const apiGoal = apiGoals.find((candidate) => candidate.id === goal.id);
            if (apiGoal && apiGoal.result !== goal.result) {
              void fetch(`/api/goals/${goal.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ result: goal.result }),
              });
            }
          }
        }
        if (data.currentMember?.id) {
          setCurrentMember({
            id: data.currentMember.id,
            name: data.currentMember.name ?? fallback?.name,
            email: data.currentMember.email ?? fallback?.email,
          });
        }
        if (Array.isArray(data.members) && data.members.length > 0) {
          setMembers(data.members);
        }
      } catch (error) {
        console.error("Failed to load goals:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGoals();

    return () => {
      cancelled = true;
    };
  }, [fullName, user?.id, userEmailsKey]);

  const updateResult = useCallback(async (goalId: string, result: GoalResult) => {
    let updated: Goal | undefined;
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }
        updated = { ...goal, result };
        return updated;
      })
    );

    if (updated) {
      overridesRef.current = recordGoalResultOverride(overridesRef.current, updated, result);
      writeStoredOverrides(overridesRef.current);
    }

    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  }, []);

  return {
    goals,
    setGoals,
    loading,
    currentMember: currentMember ?? fallbackMember,
    members,
    userEmails,
    updateResult,
  };
}
