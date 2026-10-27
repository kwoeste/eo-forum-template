"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { INITIAL_MEMBERS } from "@/lib/members-data";

interface RoundTableItem {
  id: string;
  memberId: string | null;
  memberName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  date: string | null;
  noteText: string;
  isHighlighted: boolean;
  status: string;
  createdAt: string;
}

type TabFilter = "active" | "completed" | "archived";

function formatItemDate(date: string | null): string {
  if (!date) return "No date";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

export function RoundTableClient() {
  const { user } = useUser();
  const [items, setItems] = useState<RoundTableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [tabFilter, setTabFilter] = useState<TabFilter>("active");
  const [newItem, setNewItem] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    memberId: "",
    noteText: "",
  });

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/round-table");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setItems(data.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch round table data:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/round-table");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch round table data:", error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.noteText.trim()) {
      alert("Please enter a topic");
      return;
    }

    const member = newItem.memberId
      ? INITIAL_MEMBERS.find((m) => m.id === newItem.memberId)
      : null;

    const itemData = {
      memberId: newItem.memberId || null,
      memberName: member?.name || null,
      date: newItem.date,
      noteText: newItem.noteText,
    };

    setNewItem({
      date: format(new Date(), "yyyy-MM-dd"),
      memberId: "",
      noteText: "",
    });
    setShowAddForm(false);

    try {
      const response = await fetch("/api/round-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const setItemStatus = async (id: string, status: string) => {
    let snapshot: RoundTableItem[] | null = null;
    setItems((current) => {
      snapshot = current;
      return current.map((item) => (item.id === id ? { ...item, status } : item));
    });

    try {
      const response = await fetch(`/api/round-table/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok && snapshot) {
        setItems(snapshot);
      }
    } catch (error) {
      console.error("Failed to update round table item:", error);
      if (snapshot) {
        setItems(snapshot);
      }
    }
  };

  const markCompleted = async (id: string) => {
    await setItemStatus(id, "completed-round-table");
  };

  const archiveItem = async (id: string) => {
    await setItemStatus(id, "archived-round-table");
  };

  const restoreItem = async (id: string) => {
    await setItemStatus(id, "converted-round-table");
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      const response = await fetch(`/api/round-table/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete round table item:", error);
      await fetchData();
    }
  };

  const filteredItems = useMemo(() => {
    switch (tabFilter) {
      case "active":
        return items.filter((item) => item.status === "converted-round-table");
      case "completed":
        return items.filter((item) => item.status === "completed-round-table");
      case "archived":
        return items.filter((item) => item.status === "archived-round-table");
      default: {
        const _exhaustive: never = tabFilter;
        return _exhaustive;
      }
    }
  }, [items, tabFilter]);

  const activeCount = items.filter((i) => i.status === "converted-round-table").length;
  const completedCount = items.filter((i) => i.status === "completed-round-table").length;
  const archivedCount = items.filter((i) => i.status === "archived-round-table").length;

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTabFilter("active")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                tabFilter === "active"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Active{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <button
              onClick={() => setTabFilter("completed")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                tabFilter === "completed"
                  ? "bg-green-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Completed{completedCount > 0 ? ` (${completedCount})` : ""}
            </button>
            <button
              onClick={() => setTabFilter("archived")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                tabFilter === "archived"
                  ? "bg-stone-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary text-sm"
          >
            {showAddForm ? "Cancel" : "Add Topic"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-4">Add Round Table Topic</h3>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newItem.date}
                  onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Person (optional)</label>
                <select
                  value={newItem.memberId}
                  onChange={(e) => setNewItem({ ...newItem, memberId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Group topic</option>
                  {INITIAL_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Topic *</label>
              <textarea
                value={newItem.noteText}
                onChange={(e) => setNewItem({ ...newItem, noteText: e.target.value })}
                rows={2}
                className="w-full"
                placeholder="Enter the round table topic..."
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddItem}
                disabled={!newItem.noteText.trim()}
                className="btn btn-primary"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card p-12 text-center">
          <p className="text-stone-500">Loading...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-stone-500 mb-2">
            {tabFilter === "active" && "No active Round Table topics"}
            {tabFilter === "completed" && "No completed topics"}
            {tabFilter === "archived" && "No archived topics"}
          </p>
          <p className="text-sm text-stone-400">
            {tabFilter === "active" &&
              "Convert topics from the Parking Lot using → Round Table, or add a new topic above."}
            {tabFilter === "completed" && "Topics marked as completed will appear here."}
            {tabFilter === "archived" && "Archived topics will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isCompleted = item.status === "completed-round-table";
            const isArchived = item.status === "archived-round-table";
            return (
              <div
                key={item.id}
                className={`card p-4 ${isCompleted ? "bg-green-50 border-green-200" : ""} ${
                  isArchived ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {isCompleted && (
                        <span className="badge bg-green-100 text-green-800">Completed</span>
                      )}
                      {isArchived && (
                        <span className="badge badge-muted">Archived</span>
                      )}
                      {item.memberName && (
                        <span className="text-xs text-stone-500">{item.memberName}</span>
                      )}
                    </div>
                    <p
                      className={`text-stone-900 ${
                        isCompleted || isArchived ? "line-through decoration-stone-300" : ""
                      }`}
                    >
                      {item.noteText}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{formatItemDate(item.date)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {item.status === "converted-round-table" && (
                      <>
                        <button
                          onClick={() => markCompleted(item.id)}
                          className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100"
                        >
                          Mark Completed
                        </button>
                        <button
                          onClick={() => archiveItem(item.id)}
                          className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    {(isCompleted || isArchived) && (
                      <button
                        onClick={() => restoreItem(item.id)}
                        className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        Restore
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
