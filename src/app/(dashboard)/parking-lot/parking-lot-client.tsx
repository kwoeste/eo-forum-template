"use client";
import { siteConfig, isEmail } from "@/site.config";

import { useState, useRef, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { INITIAL_MEMBERS } from "@/lib/members-data";

interface EditFormData {
  noteText: string;
  date: string;
  memberId: string;
  categoryId: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function normalizeDate(dateStr: string): string {
  return dateStr?.trim() || '';
}

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface ParkingLotItem {
  id: string;
  memberId: string | null;
  memberName: string | null;
  categoryId: string;
  categoryName: string;
  date: string | null;
  noteText: string;
  isHighlighted: boolean;
  status: string;
}

type DateSort = "newest" | "oldest";

function isArchivedItem(item: ParkingLotItem): boolean {
  return item.status === "archived";
}

function formatItemDate(date: string | null): string {
  if (!date) return "No date";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

function itemMatchesDateRange(
  item: ParkingLotItem,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!item.date) return false;
  if (dateFrom && item.date < dateFrom) return false;
  if (dateTo && item.date > dateTo) return false;
  return true;
}

function compareByDate(a: ParkingLotItem, b: ParkingLotItem, sort: DateSort): number {
  const aDate = a.date ?? "";
  const bDate = b.date ?? "";
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  const cmp = aDate.localeCompare(bDate);
  switch (sort) {
    case "newest":
      return -cmp;
    case "oldest":
      return cmp;
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

export function ParkingLotClient() {
  const { user } = useUser();
  const [items, setItems] = useState<ParkingLotItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("newest");
  const [showArchived, setShowArchived] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [editingItem, setEditingItem] = useState<ParkingLotItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    noteText: "",
    date: "",
    memberId: "",
    categoryId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    memberId: "",
    categoryId: "",
    noteText: "",
  });

  const isAdmin = user?.emailAddresses?.some(
    (email) => isEmail(email.emailAddress, siteConfig.adminEmail)
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/parking-lot");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setItems(data.items || []);
          setCategories(data.categories || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch parking lot data:", error);
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
      const response = await fetch("/api/parking-lot");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch parking lot data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.noteText.trim() || !newItem.categoryId) {
      alert("Please select a category and enter a note");
      return;
    }
    
    const category = categories.find((c) => c.id === newItem.categoryId);
    const member = newItem.memberId
      ? INITIAL_MEMBERS.find((m) => m.id === newItem.memberId)
      : null;

    const itemData = {
      memberId: newItem.memberId || null,
      memberName: member?.name || null,
      categoryId: newItem.categoryId,
      categoryName: category?.name || "",
      date: newItem.date,
      noteText: newItem.noteText,
      isHighlighted: false,
      status: "active",
    };

    setNewItem({
      date: format(new Date(), "yyyy-MM-dd"),
      memberId: "",
      categoryId: "",
      noteText: "",
    });
    setShowAddForm(false);

    try {
      const response = await fetch("/api/parking-lot", {
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const VALID_MEMBER_NAMES: string[] = []; // optional: restrict imported names to your members

    const categoryNames = [
      "Important Urgent",
      "Important",
      "Not Urgent",
      "Not Important Not Urgent",
      "Wisdom",
    ];

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const itemsToImport: Array<{
        memberName: string | null;
        categoryName: string;
        date: string;
        noteText: string;
        isHighlighted: boolean;
        status: string;
      }> = [];

      if (lines.length === 0) {
        setImportStatus("Empty CSV file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const headerLine = parseCSVLine(lines[0]);
      const headerLower = headerLine.map(h => h.toLowerCase().trim());
      const isCleanedFormat = 
        headerLower.length >= 4 &&
        headerLower[0] === "date" &&
        headerLower[1] === "person" &&
        headerLower[2] === "category" &&
        headerLower[3] === "note";

      if (isCleanedFormat) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = parseCSVLine(line);
          const rawDate = normalizeDate(cols[0] || "");
          const personRaw = cols[1]?.trim() || "";
          const categoryRaw = cols[2]?.trim() || "";
          const noteRaw = cols[3]?.trim() || "";

          if (!noteRaw) continue;

          let memberName: string | null = null;
          if (personRaw) {
            const exactMatch = VALID_MEMBER_NAMES.find(
              (name) => name.toLowerCase() === personRaw.toLowerCase()
            );
            if (exactMatch) {
              memberName = exactMatch;
            }
          }

          itemsToImport.push({
            memberName,
            categoryName: categoryRaw,
            date: rawDate,
            noteText: noteRaw,
            isHighlighted: false,
            status: "active",
          });
        }
      } else {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = parseCSVLine(line);
          const rawDate = cols[0];
          const date = normalizeDate(rawDate);
          
          categoryNames.forEach((catName, catIndex) => {
            const cellText = cols[catIndex + 1];
            if (cellText && cellText.trim()) {
              let memberName: string | null = null;
              let noteText = cellText.trim();

              const memberMatch = cellText.match(/^([A-Za-z]+):\s*/);
              if (memberMatch) {
                const possibleName = memberMatch[1];
                const member = INITIAL_MEMBERS.find(
                  (m) =>
                    m.name.toLowerCase().startsWith(possibleName.toLowerCase()) ||
                    m.name.split(" ")[0].toLowerCase() === possibleName.toLowerCase()
                );
                if (member) {
                  memberName = member.name;
                  noteText = cellText.replace(memberMatch[0], "").trim();
                }
              }

              if (noteText) {
                itemsToImport.push({
                  memberName,
                  categoryName: catName,
                  date,
                  noteText,
                  isHighlighted: false,
                  status: "active",
                });
              }
            }
          });
        }
      }

      if (itemsToImport.length === 0) {
        setImportStatus("No items found in CSV");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const formatLabel = isCleanedFormat ? "cleaned" : "legacy";
      setImportStatus(`${replaceAll ? "Replacing" : "Importing"} ${itemsToImport.length} items (${formatLabel} format)...`);

      try {
        const response = await fetch("/api/parking-lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToImport, replaceAll }),
        });

        const result = await response.json();

        if (response.ok) {
          const createdCount = result.created?.length || 0;
          const skippedCount = result.skipped?.length || 0;
          const errorCount = result.errors?.length || 0;
          const action = replaceAll ? "Replaced with" : "Imported";

          if (errorCount === 0 && skippedCount === 0) {
            setImportStatus(`Successfully ${action.toLowerCase()} ${createdCount} items`);
          } else {
            setImportStatus(`${action} ${createdCount}, skipped ${skippedCount}, errors ${errorCount}`);
          }
          
          await fetchData();
          setShowImport(false);
          setReplaceAll(false);
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          const errorDetails = result.details || result.error || 'Unknown error';
          setImportStatus(`Import failed: ${errorDetails}`);
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportStatus("Import failed. Please try again.");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const toggleHighlight = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    
    const newHighlighted = !item.isHighlighted;
    
    setItems(items.map((i) =>
      i.id === id ? { ...i, isHighlighted: newHighlighted } : i
    ));

    try {
      const response = await fetch(`/api/parking-lot/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHighlighted: newHighlighted }),
      });
      if (!response.ok) {
        setItems(items.map((i) =>
          i.id === id ? { ...i, isHighlighted: item.isHighlighted } : i
        ));
      }
    } catch (error) {
      console.error("Failed to toggle highlight:", error);
      setItems(items.map((i) =>
        i.id === id ? { ...i, isHighlighted: item.isHighlighted } : i
      ));
    }
  };

  const convertToDeepDive = async (id: string) => {
    await setItemStatus(id, "converted-deep-dive");
  };

  const convertToRoundTable = async (id: string) => {
    await setItemStatus(id, "converted-round-table");
  };

  const deleteItem = (id: string) => {
    if (confirm("Delete this item?")) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const startEditing = (item: ParkingLotItem) => {
    setEditingItem(item);
    const matchedMember = item.memberName
      ? INITIAL_MEMBERS.find(
          (m) => m.name.toLowerCase() === item.memberName?.toLowerCase()
        )
      : null;
    setEditForm({
      noteText: item.noteText,
      date: item.date || "",
      memberId: matchedMember?.id || "",
      categoryId: item.categoryId,
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm({
      noteText: "",
      date: "",
      memberId: "",
      categoryId: "",
    });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    if (!editForm.noteText.trim() || !editForm.categoryId) {
      alert("Please select a category and enter a note");
      return;
    }

    const member = editForm.memberId
      ? INITIAL_MEMBERS.find((m) => m.id === editForm.memberId)
      : null;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/parking-lot/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteText: editForm.noteText.trim(),
          date: editForm.date || null,
          memberName: member?.name || null,
          categoryId: editForm.categoryId,
        }),
      });

      if (response.ok) {
        await fetchData();
        cancelEditing();
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const setItemStatus = async (id: string, status: string) => {
    let snapshot: ParkingLotItem[] | null = null;
    setItems((current) => {
      snapshot = current;
      return current.map((item) => (item.id === id ? { ...item, status } : item));
    });

    try {
      const response = await fetch(`/api/parking-lot/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok && snapshot) {
        setItems(snapshot);
      }
    } catch (error) {
      console.error("Failed to update parking lot item:", error);
      if (snapshot) {
        setItems(snapshot);
      }
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      sortOrder: categories.length + 1,
    };
    setCategories([...categories, newCat]);
    setNewCategoryName("");
  };

  const renameCategory = (id: string, newName: string) => {
    setCategories(categories.map((cat) =>
      cat.id === id ? { ...cat, name: newName } : cat
    ));
    setItems(items.map((item) =>
      item.categoryId === id ? { ...item, categoryName: newName } : item
    ));
    setEditingCategory(null);
  };

  const deleteCategory = (id: string) => {
    if (items.some((item) => item.categoryId === id)) {
      alert("Cannot delete category with existing items");
      return;
    }
    setCategories(categories.filter((cat) => cat.id !== id));
  };

  const moveCategoryUp = (id: string) => {
    const index = categories.findIndex((c) => c.id === id);
    if (index <= 0) return;
    const newCats = [...categories];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    newCats.forEach((c, i) => c.sortOrder = i + 1);
    setCategories(newCats);
  };

  const moveCategoryDown = (id: string) => {
    const index = categories.findIndex((c) => c.id === id);
    if (index >= categories.length - 1) return;
    const newCats = [...categories];
    [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    newCats.forEach((c, i) => c.sortOrder = i + 1);
    setCategories(newCats);
  };

  const archivedCount = items.filter(isArchivedItem).length;
  const hasDateFilter = Boolean(dateFrom || dateTo);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const archived = isArchivedItem(item);
        if (archived) {
          if (!showArchived) return false;
        } else if (item.status !== "active") {
          return false;
        }

        if (filter === "highlighted" && !item.isHighlighted) return false;
        if (filter !== "all" && filter !== "highlighted" && item.categoryId !== filter) {
          return false;
        }

        return itemMatchesDateRange(item, dateFrom, dateTo);
      })
      .slice()
      .sort((a, b) => compareByDate(a, b, dateSort));
  }, [items, filter, dateFrom, dateTo, dateSort, showArchived]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                filter === "all"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("highlighted")}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                filter === "highlighted"
                  ? "bg-amber-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Highlighted
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-3 py-1.5 text-sm rounded font-medium ${
                  filter === cat.id
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="btn btn-ghost text-sm"
                >
                  Categories
                </button>
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="btn btn-ghost text-sm"
                >
                  Import
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary text-sm"
            >
              {showAddForm ? "Cancel" : "Add Item"}
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-stone-200 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="parking-lot-date-from" className="block text-xs font-medium text-stone-600 mb-1">
              From
            </label>
            <input
              id="parking-lot-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="parking-lot-date-to" className="block text-xs font-medium text-stone-600 mb-1">
              To
            </label>
            <input
              id="parking-lot-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm"
            />
          </div>
          {hasDateFilter ? (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="btn btn-ghost text-sm"
            >
              Clear dates
            </button>
          ) : null}
          <div>
            <label htmlFor="parking-lot-date-sort" className="block text-xs font-medium text-stone-600 mb-1">
              Sort by date
            </label>
            <select
              id="parking-lot-date-sort"
              value={dateSort}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "newest" || value === "oldest") {
                  setDateSort(value);
                }
              }}
              className="text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 pb-2 sm:ml-auto">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span>
              Show archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
            </span>
          </label>
        </div>
      </div>

      {/* Category Manager */}
      {showCategoryManager && isAdmin && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-4">Manage Categories</h3>
          <div className="space-y-2 mb-4">
            {categories.map((cat, index) => (
              <div key={cat.id} className="flex items-center gap-2 bg-stone-50 p-2 rounded">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveCategoryUp(cat.id)}
                    disabled={index === 0}
                    className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCategoryDown(cat.id)}
                    disabled={index === categories.length - 1}
                    className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                {editingCategory === cat.id ? (
                  <input
                    type="text"
                    defaultValue={cat.name}
                    className="flex-1 text-sm"
                    autoFocus
                    onBlur={(e) => renameCategory(cat.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameCategory(cat.id, e.currentTarget.value);
                      if (e.key === "Escape") setEditingCategory(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm text-stone-900">{cat.name}</span>
                )}
                <button
                  onClick={() => setEditingCategory(cat.id)}
                  className="text-xs text-stone-500 hover:text-stone-700"
                >
                  Rename
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button onClick={addCategory} className="btn btn-primary text-sm">
              Add Category
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-2">Import from CSV</h3>
          <p className="text-sm text-stone-600 mb-4">
            Upload a file with columns: Date, Important Urgent, Important, Not Urgent, 
            Not Important Not Urgent, Wisdom. Leading names like &quot;Jane:&quot; will be parsed as person.
          </p>
          <div className="flex items-center gap-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span>Replace all existing items (delete current items before import)</span>
          </label>
          {importStatus && (
            <p className="text-sm text-stone-600 mt-2">{importStatus}</p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-900">Edit Parking Lot Item</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Person</label>
                  <select
                    value={editForm.memberId}
                    onChange={(e) => setEditForm({ ...editForm, memberId: e.target.value })}
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
                <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Topic / Note *</label>
                <textarea
                  value={editForm.noteText}
                  onChange={(e) => setEditForm({ ...editForm, noteText: e.target.value })}
                  rows={3}
                  className="w-full"
                  placeholder="Topic or note..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={isSaving || !editForm.noteText.trim() || !editForm.categoryId}
                className="btn btn-primary"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="card p-4">
          <h3 className="font-semibold text-stone-900 mb-4">Add Item</h3>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Date *</label>
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
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Topic / Note *</label>
              <textarea
                value={newItem.noteText}
                onChange={(e) => setNewItem({ ...newItem, noteText: e.target.value })}
                rows={2}
                className="w-full"
                placeholder="Topic or note..."
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddItem}
                disabled={!newItem.noteText.trim() || !newItem.categoryId}
                className="btn btn-primary"
              >
                Add Item
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
          <p className="text-stone-500 mb-2">No items in the parking lot</p>
          <p className="text-sm text-stone-400">
            {archivedCount > 0 && !showArchived
              ? "Archived items are hidden. Turn on Show archived to see them."
              : hasDateFilter
                ? "No items match the selected dates."
                : isAdmin
                  ? "Import a CSV or add items manually."
                  : "Check back later for new topics."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const archived = isArchivedItem(item);
            return (
            <div
              key={item.id}
              className={`card p-4 ${item.isHighlighted && !archived ? "accent-border" : ""} ${
                archived ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="badge badge-muted">{item.categoryName}</span>
                    {archived ? (
                      <span className="badge badge-muted">Archived</span>
                    ) : null}
                    {item.isHighlighted && !archived ? (
                      <span className="badge badge-accent">Highlighted</span>
                    ) : null}
                    {item.memberName && (
                      <span className="text-xs text-stone-500">{item.memberName}</span>
                    )}
                  </div>
                  <p className={`text-stone-900 ${archived ? "line-through decoration-stone-300" : ""}`}>
                    {item.noteText}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">{formatItemDate(item.date)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {archived ? (
                    <button
                      onClick={() => setItemStatus(item.id, "active")}
                      className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(item)}
                        className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleHighlight(item.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          item.isHighlighted
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-600 hover:bg-amber-50"
                        }`}
                      >
                        {item.isHighlighted ? "Unhighlight" : "Highlight"}
                      </button>
                      <button
                        onClick={() => convertToDeepDive(item.id)}
                        className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        → Deep Dive
                      </button>
                      <button
                        onClick={() => convertToRoundTable(item.id)}
                        className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        → Round Table
                      </button>
                      <button
                        onClick={() => setItemStatus(item.id, "archived")}
                        className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        Archive
                      </button>
                    </>
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
