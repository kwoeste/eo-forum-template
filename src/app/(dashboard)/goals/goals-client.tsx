"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format, addMonths, parseISO } from "date-fns";
import { goalBelongsToMember, isOpenGoal, partitionGoals, type Goal } from "@/lib/goals-data";
import { useGoals, type MemberOption } from "@/lib/use-goals";

const HORIZONS = [
  { value: 1, label: "1 Month" },
  { value: 6, label: "6 Month" },
  { value: 12, label: "12 Month" },
] as const;

type HorizonValue = (typeof HORIZONS)[number]["value"];
type GroupBy = "person" | "horizon";
type PersonSort = "az" | "za";
type GoalResult = Goal["result"];

function groupCountLabel(activeCount: number, completedCount: number): string {
  if (activeCount > 0) {
    return `${activeCount} ${activeCount === 1 ? "goal" : "goals"}`;
  }
  if (completedCount > 0) {
    return `${completedCount} completed`;
  }
  return "0 goals";
}

function ResultBadge({ result }: { result: GoalResult }) {
  switch (result) {
    case "open":
      return null;
    case "hit":
      return <span className="badge badge-success">Hit</span>;
    case "missed":
      return <span className="badge badge-error">Missed</span>;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function GoalRow({
  goal,
  groupBy,
  isEditing,
  members,
  onEdit,
  onCancelEdit,
  onStartEdit,
  onUpdateResult,
  onDelete,
}: {
  goal: Goal;
  groupBy: GroupBy;
  isEditing: boolean;
  members: MemberOption[];
  onEdit: (newText: string, newMemberId?: string) => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onUpdateResult: (result: GoalResult) => void;
  onDelete: () => void;
}) {
  const [editText, setEditText] = useState(goal.goalText);
  const [editMemberId, setEditMemberId] = useState(goal.memberId);

  const handleSave = () => {
    onEdit(editText, editMemberId !== goal.memberId ? editMemberId : undefined);
  };

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Person</label>
                <select
                  value={editMemberId}
                  onChange={(e) => setEditMemberId(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded px-2 py-1.5"
                >
                  {sortedMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Goal</label>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded px-2 py-1.5"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") onCancelEdit();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-stone-900 text-white hover:bg-stone-800"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-stone-900 ${isOpenGoal(goal) ? "" : "line-through opacity-60"}`}>
              {goal.goalText}
            </p>
          )}
          {!isEditing && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
              <span>Set: {format(parseISO(goal.setDate), "MMM d, yyyy")}</span>
              <span>Target: {format(parseISO(goal.targetDate), "MMM d, yyyy")}</span>
              {goal.memberName && groupBy !== "person" && (
                <span className="font-medium">{goal.memberName}</span>
              )}
              <span className="badge badge-muted">
                {HORIZONS.find((horizon) => horizon.value === goal.horizon)?.label ?? `${goal.horizon} Month`}
              </span>
              {goal.month && <span className="badge badge-muted">{goal.month}</span>}
              <ResultBadge result={goal.result} />
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onUpdateResult("hit")}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                goal.result === "hit"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-stone-100 text-stone-500 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              Hit
            </button>
            <button
              onClick={() => onUpdateResult("missed")}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                goal.result === "missed"
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-700"
              }`}
            >
              Miss
            </button>
            <button
              onClick={() => {
                setEditText(goal.goalText);
                setEditMemberId(goal.memberId);
                onStartEdit();
              }}
              className="px-2 py-1.5 rounded text-xs font-medium bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1.5 rounded text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100"
            >
              Del
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GoalsClient() {
  const { user } = useUser();
  const { goals, setGoals, updateResult, currentMember, members } = useGoals();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    goalText: "",
    horizon: 1,
    memberId: "",
  });
  const [saving, setSaving] = useState(false);

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const [filter, setFilter] = useState<"all" | "open" | HorizonValue>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("person");
  const [personSort, setPersonSort] = useState<PersonSort>("az");

  const handleAddGoal = async () => {
    if (!newGoal.goalText.trim() || !newGoal.memberId) return;
    setSaving(true);
    
    const today = new Date();
    const targetDate = addMonths(today, newGoal.horizon);
    const selectedMember = members.find((m) => m.id === newGoal.memberId);
    const memberName = selectedMember?.name || user?.fullName || "Unknown";
    
    const goal: Goal = {
      id: `new-${Date.now()}`,
      memberId: newGoal.memberId,
      memberName: memberName,
      goalText: newGoal.goalText,
      horizon: newGoal.horizon,
      setDate: format(today, "yyyy-MM-dd"),
      targetDate: format(targetDate, "yyyy-MM-dd"),
      result: "open",
    };
    
    setGoals([goal, ...goals]);
    setNewGoal({ goalText: "", horizon: 1, memberId: currentMember?.id || "" });
    setShowAddForm(false);
    setSaving(false);

    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalText: newGoal.goalText,
          horizon: newGoal.horizon,
          memberId: newGoal.memberId,
          setDate: format(today, "yyyy-MM-dd"),
          targetDate: format(targetDate, "yyyy-MM-dd"),
        }),
      });
    } catch (error) {
      console.error("Failed to save goal:", error);
    }
  };

  const handleUpdateResult = (goalId: string, result: "open" | "hit" | "missed") => {
    void updateResult(goalId, result);
  };

  const handleEditGoal = async (goalId: string, newText: string, newMemberId?: string) => {
    const newMemberName = newMemberId ? members.find((m) => m.id === newMemberId)?.name : undefined;
    setGoals(goals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        goalText: newText,
        ...(newMemberId && { memberId: newMemberId, memberName: newMemberName }),
      };
    }));
    setEditingGoal(null);

    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalText: newText,
          ...(newMemberId && { memberId: newMemberId }),
        }),
      });
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Delete this goal?")) {
      setGoals(goals.filter((g) => g.id !== goalId));
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (memberFilter !== "all" && g.memberId !== memberFilter) return false;
    if (filter === "open") return g.result === "open";
    if (typeof filter === "number") return g.horizon === filter;
    return true;
  });

  const memberNameFor = (goal: Goal) =>
    goal.memberName
    ?? members.find((member) => member.id === goal.memberId)?.name
    ?? "Unknown";

  const groupedByHorizon = HORIZONS.map((h) => ({
    key: `horizon-${h.value}`,
    label: `${h.label} Goals`,
    goals: filteredGoals.filter((g) => g.horizon === h.value),
  })).filter((group) => group.goals.length > 0);

  const groupedByPerson = members
    .map((member) => ({
      key: `person-${member.id}`,
      label: member.name,
      goals: filteredGoals.filter((goal) => goalBelongsToMember(goal, member)),
    }))
    .filter((group) => group.goals.length > 0)
    .sort((a, b) => {
      const result = a.label.localeCompare(b.label);
      return personSort === "az" ? result : -result;
    });

  const extraPersonGroups = Object.values(
    filteredGoals
      .filter((goal) => !members.some((member) => goalBelongsToMember(goal, member)))
      .reduce<Record<string, { key: string; label: string; goals: Goal[] }>>((groups, goal) => {
        const label = memberNameFor(goal);
        const key = `person-${goal.memberId || label}`;
        if (!groups[key]) {
          groups[key] = { key, label, goals: [] };
        }
        groups[key].goals.push(goal);
        return groups;
      }, {})
  );

  const visibleGroups = groupBy === "person"
    ? [...groupedByPerson, ...extraPersonGroups].sort((a, b) => {
        const result = a.label.localeCompare(b.label);
        return personSort === "az" ? result : -result;
      })
    : groupedByHorizon;

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                filter === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("open")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                filter === "open" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Open
            </button>
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                onClick={() => setFilter(h.value)}
                className={`px-3 py-1.5 text-sm rounded font-medium ${
                  filter === h.value ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex rounded border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupBy("person")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  groupBy === "person" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                By person
              </button>
              <button
                type="button"
                onClick={() => setGroupBy("horizon")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  groupBy === "horizon" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                By horizon
              </button>
            </div>
            {groupBy === "person" && (
              <button
                type="button"
                onClick={() => setPersonSort(personSort === "az" ? "za" : "az")}
                className="px-3 py-1.5 text-sm rounded font-medium text-stone-600 hover:bg-stone-100 border border-stone-200"
              >
                {personSort === "az" ? "A–Z" : "Z–A"}
              </button>
            )}
            <button
              onClick={() => {
                if (!showAddForm) {
                  setNewGoal({ goalText: "", horizon: 1, memberId: currentMember?.id || "" });
                }
                setShowAddForm(!showAddForm);
              }}
              className="btn btn-primary text-sm"
            >
              {showAddForm ? "Cancel" : "Add Goal"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => setMemberFilter("all")}
            className={`px-3 py-1.5 text-sm rounded font-medium ${
              memberFilter === "all" ? "bg-amber-100 text-amber-800 border border-amber-300" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            All people
          </button>
          {sortedMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setMemberFilter(member.id)}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                memberFilter === member.id
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {member.name}
            </button>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-4">Add New Goal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Person</label>
              <div className="flex flex-wrap gap-2">
                {sortedMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setNewGoal({ ...newGoal, memberId: member.id })}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      newGoal.memberId === member.id
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
              {!newGoal.memberId && (
                <p className="mt-1 text-xs text-red-500">Please select a person</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Goal</label>
              <textarea
                value={newGoal.goalText}
                onChange={(e) => setNewGoal({ ...newGoal, goalText: e.target.value })}
                rows={2}
                className="w-full"
                placeholder="What do you want to achieve?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Horizon</label>
              <div className="flex gap-2">
                {HORIZONS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setNewGoal({ ...newGoal, horizon: h.value })}
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      newGoal.horizon === h.value
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddGoal}
                disabled={saving || !newGoal.goalText.trim() || !newGoal.memberId}
                className="btn btn-primary"
              >
                {saving ? "Saving..." : "Add Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleGroups.length === 0 && (
        <div className="card p-8 text-center text-stone-500 text-sm">
          No goals match these filters
        </div>
      )}

      {visibleGroups.map((group) => {
        const { active, completed } = partitionGoals(group.goals);

        return (
          <div key={group.key} className="card">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">{group.label}</h2>
              <span className="text-sm text-stone-500">
                {groupCountLabel(active.length, completed.length)}
              </span>
            </div>
            {active.length > 0 && (
              <div className="divide-y divide-stone-200">
                {active.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    groupBy={groupBy}
                    isEditing={editingGoal === goal.id}
                    members={members}
                    onEdit={(newText, newMemberId) => handleEditGoal(goal.id, newText, newMemberId)}
                    onCancelEdit={() => setEditingGoal(null)}
                    onStartEdit={() => setEditingGoal(goal.id)}
                    onUpdateResult={(result) => handleUpdateResult(goal.id, result)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                ))}
              </div>
            )}
            {completed.length > 0 && (
              <div className={active.length > 0 ? "border-t border-stone-200" : ""}>
                <div className="px-4 py-3 bg-stone-50 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Completed
                  </h3>
                  <span className="text-xs text-stone-400">
                    {completed.length} {completed.length === 1 ? "goal" : "goals"}
                  </span>
                </div>
                <div className="divide-y divide-stone-200 bg-stone-50/60">
                  {completed.map((goal) => (
                    <GoalRow
                      key={goal.id}
                      goal={goal}
                      groupBy={groupBy}
                      isEditing={editingGoal === goal.id}
                      members={members}
                      onEdit={(newText, newMemberId) => handleEditGoal(goal.id, newText, newMemberId)}
                      onCancelEdit={() => setEditingGoal(null)}
                      onStartEdit={() => setEditingGoal(goal.id)}
                      onUpdateResult={(result) => handleUpdateResult(goal.id, result)}
                      onDelete={() => handleDeleteGoal(goal.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
