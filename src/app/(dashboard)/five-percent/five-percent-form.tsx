"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type TextareaHTMLAttributes } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface AutoResizeTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
}

function AutoResizeTextarea({ value, onChange, minHeight = 108, className, ...props }: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [minHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });
    resizeObserver.observe(textarea);
    
    return () => resizeObserver.disconnect();
  }, [adjustHeight]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      className={className}
      style={{ minHeight: `${minHeight}px`, overflow: 'hidden' }}
      {...props}
    />
  );
}

interface ReflectionData {
  id?: string;
  workFeelings: string;
  workCauses: string;
  workSignificance: string;
  familyFeelings: string;
  familyCauses: string;
  familySignificance: string;
  personalFeelings: string;
  personalCauses: string;
  personalSignificance: string;
  future30to60: string;
  whyTopics: string;
  whatHowTopics: string;
  completedAt?: string | null;
  pdfUrl?: string | null;
  updatedAt?: string | null;
}

interface InitialReflection {
  id: string;
  workFeelings: string | null;
  workCauses: string | null;
  workSignificance: string | null;
  familyFeelings: string | null;
  familyCauses: string | null;
  familySignificance: string | null;
  personalFeelings: string | null;
  personalCauses: string | null;
  personalSignificance: string | null;
  future30to60: string | null;
  whyTopics: string | null;
  whatHowTopics: string | null;
  completedAt: string | null;
  pdfUrl: string | null;
  updatedAt: string;
}

const INITIAL_DATA: ReflectionData = {
  workFeelings: "",
  workCauses: "",
  workSignificance: "",
  familyFeelings: "",
  familyCauses: "",
  familySignificance: "",
  personalFeelings: "",
  personalCauses: "",
  personalSignificance: "",
  future30to60: "",
  whyTopics: "",
  whatHowTopics: "",
};

interface FivePercentFormProps {
  initialData?: InitialReflection | null;
  onSaved?: () => void;
  memberName?: string;
  onUploadInstead?: () => void;
}

export function FivePercentForm({
  initialData,
  onSaved,
  memberName,
  onUploadInstead,
}: FivePercentFormProps) {
  const [data, setData] = useState<ReflectionData>(() => {
    if (initialData) {
      return {
        id: initialData.id,
        workFeelings: initialData.workFeelings || "",
        workCauses: initialData.workCauses || "",
        workSignificance: initialData.workSignificance || "",
        familyFeelings: initialData.familyFeelings || "",
        familyCauses: initialData.familyCauses || "",
        familySignificance: initialData.familySignificance || "",
        personalFeelings: initialData.personalFeelings || "",
        personalCauses: initialData.personalCauses || "",
        personalSignificance: initialData.personalSignificance || "",
        future30to60: initialData.future30to60 || "",
        whyTopics: initialData.whyTopics || "",
        whatHowTopics: initialData.whatHowTopics || "",
        completedAt: initialData.completedAt,
        pdfUrl: initialData.pdfUrl,
        updatedAt: initialData.updatedAt,
      };
    }
    return INITIAL_DATA;
  });
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(initialData?.updatedAt || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [convertWhyTopic, setConvertWhyTopic] = useState(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const isCompleted = !!data.completedAt;
  const isReadOnly = isCompleted;

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const zonedDate = toZonedTime(date, "America/New_York");
      return format(zonedDate, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  const saveData = useCallback(async (isAutoSave = false) => {
    if (isReadOnly) return;
    
    if (isAutoSave) {
      setAutoSaveStatus("saving");
    } else {
      setSaving(true);
    }

    try {
      const response = await fetch("/api/five-percent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          ...data,
          convertWhyTopic: isAutoSave ? false : convertWhyTopic,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const now = new Date().toISOString();
        setData((prev) => ({ 
          ...prev, 
          id: result.reflection.id,
          updatedAt: result.reflection.updatedAt || now,
        }));
        setLastSaved(result.reflection.updatedAt || now);
        setHasUnsavedChanges(false);
        
        if (isAutoSave) {
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        }
        
        onSaved?.();
        return result.reflection;
      } else {
        if (!isAutoSave) {
          alert("Failed to save reflection");
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      if (!isAutoSave) {
        alert("Failed to save reflection");
      }
    } finally {
      if (!isAutoSave) {
        setSaving(false);
      }
    }
    return null;
  }, [data, convertWhyTopic, isReadOnly, onSaved]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isReadOnly || !hasUnsavedChanges) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveData(true);
    }, 3000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [data, hasUnsavedChanges, isReadOnly, saveData]);

  const handleChange = (field: keyof ReflectionData, value: string) => {
    if (isReadOnly) return;
    setData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setAutoSaveStatus("idle");
  };

  const handleSave = async () => {
    await saveData(false);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const savedReflection = await saveData(false);
      if (!savedReflection) {
        throw new Error("Failed to save");
      }

      const reflectionId = savedReflection.id;

      const pdfResponse = await fetch(`/api/five-percent/${reflectionId}/pdf`, {
        method: "POST",
      });

      if (pdfResponse.ok) {
        const pdfResult = await pdfResponse.json();
        setData((prev) => ({
          ...prev,
          id: reflectionId,
          completedAt: pdfResult.completedAt,
          pdfUrl: pdfResult.pdfUrl,
        }));
        onSaved?.();
        alert("Reflection completed! You can now download the PDF.");
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Complete error:", error);
      alert("Failed to complete reflection");
    } finally {
      setCompleting(false);
    }
  };

  const handleDownloadPdf = (isDraft = false) => {
    if (data.id) {
      const url = isDraft 
        ? `/api/five-percent/${data.id}/pdf?draft=true`
        : `/api/five-percent/${data.id}/pdf`;
      window.open(url, "_blank");
    }
  };

  const handleClear = () => {
    if (isReadOnly) return;
    if (confirm("Clear all fields? This cannot be undone.")) {
      setData({ ...INITIAL_DATA, id: data.id });
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="eo-worksheet">
      {/* Masthead */}
      <div className="eo-masthead">
        <span className="eo-category">Forum Training | Worksheets</span>
        <h1 className="eo-title">5% REFLECTION WORKSHEET</h1>
        {memberName && data.completedAt && (
          <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem" }}>
            {memberName} • Completed {formatDateTime(data.completedAt)}
          </p>
        )}
        {!data.completedAt && data.id && (
          <div style={{ marginTop: "0.5rem" }}>
            <span style={{ 
              display: "inline-block",
              padding: "0.25rem 0.5rem",
              background: "#fef3c7",
              color: "#92400e",
              fontSize: "0.75rem",
              fontWeight: 500,
              borderRadius: "4px",
              marginRight: "0.5rem"
            }}>
              DRAFT
            </span>
            {lastSaved && (
              <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                Last saved {formatDateTime(lastSaved)}
              </span>
            )}
            {autoSaveStatus === "saving" && (
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.5rem" }}>
                Autosaving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span style={{ fontSize: "0.75rem", color: "#059669", marginLeft: "0.5rem" }}>
                Autosaved
              </span>
            )}
          </div>
        )}
        {!data.completedAt && !data.id && hasUnsavedChanges && (
          <p style={{ fontSize: "0.8125rem", color: "#f59e0b", marginTop: "0.5rem" }}>
            New draft - unsaved changes
            {autoSaveStatus === "saving" && (
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.5rem" }}>
                Autosaving...
              </span>
            )}
          </p>
        )}
        {onUploadInstead && !isCompleted && !data.id && (
          <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.75rem" }}>
            Filled it out on paper?{" "}
            <button
              type="button"
              onClick={onUploadInstead}
              className="eo-resource-link"
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}
            >
              Upload a photo of your 5% reflection PDF
            </button>
          </p>
        )}
      </div>

      {/* Main Table */}
      <div className="eo-table-wrapper">
        <table className="eo-reflection-table">
          <thead>
            <tr>
              <th className="eo-label-cell"></th>
              <th className="eo-header-cell">
                <div className="eo-col-title">How I Am Feeling?</div>
                <div className="eo-col-hint">Strongest feelings this past month. Use single words (joy, sad etc.). 3-5 emotions each box.</div>
              </th>
              <th className="eo-header-cell">
                <div className="eo-col-title">What Caused These Feelings?</div>
                <div className="eo-col-hint">Only one or two sentences to provide brief context.</div>
              </th>
              <th className="eo-header-cell">
                <div className="eo-col-title">Significance (5%)</div>
                <div className="eo-col-hint">Why was this personally significant to me? Dig deep! What do I realize about myself?</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="eo-row-label eo-work">WORK</td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.workFeelings}
                  onChange={(v) => handleChange("workFeelings", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.workCauses}
                  onChange={(v) => handleChange("workCauses", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.workSignificance}
                  onChange={(v) => handleChange("workSignificance", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
            </tr>
            <tr>
              <td className="eo-row-label eo-family">FAMILY</td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.familyFeelings}
                  onChange={(v) => handleChange("familyFeelings", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.familyCauses}
                  onChange={(v) => handleChange("familyCauses", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.familySignificance}
                  onChange={(v) => handleChange("familySignificance", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
            </tr>
            <tr>
              <td className="eo-row-label eo-personal">PERSONAL</td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.personalFeelings}
                  onChange={(v) => handleChange("personalFeelings", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.personalCauses}
                  onChange={(v) => handleChange("personalCauses", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
              <td className="eo-input-cell">
                <AutoResizeTextarea
                  value={data.personalSignificance}
                  onChange={(v) => handleChange("personalSignificance", v)}
                  className="eo-cell-textarea"
                  readOnly={isReadOnly}
                  minHeight={120}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Lined Prompts */}
      <div className="eo-prompts">
        <div className="eo-prompt">
          <label className="eo-prompt-label">
            What does the future look like in the next <strong>30-60 days</strong>?
          </label>
          <AutoResizeTextarea
            value={data.future30to60}
            onChange={(v) => handleChange("future30to60", v)}
            className="eo-lined-textarea"
            readOnly={isReadOnly}
            minHeight={80}
          />
        </div>

        <div className="eo-prompt">
          <label className="eo-prompt-label">
            The important/undecided emotionally complex topics I would like to add to my Deep Dive parking lot. (why topics)
          </label>
          <AutoResizeTextarea
            value={data.whyTopics}
            onChange={(v) => handleChange("whyTopics", v)}
            className="eo-lined-textarea"
            readOnly={isReadOnly}
            minHeight={80}
          />
          {!isReadOnly && data.whyTopics && (
            <label className="eo-parking-option print-hide">
              <input
                type="checkbox"
                checked={convertWhyTopic}
                onChange={(e) => setConvertWhyTopic(e.target.checked)}
              />
              <span>Add to public Parking Lot</span>
            </label>
          )}
        </div>

        <div className="eo-prompt">
          <label className="eo-prompt-label">
            Topics I would like to explore to learn or make better decisions. (what and how topics)
          </label>
          <AutoResizeTextarea
            value={data.whatHowTopics}
            onChange={(v) => handleChange("whatHowTopics", v)}
            className="eo-lined-textarea"
            readOnly={isReadOnly}
            minHeight={80}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="eo-footer">
        <div className="eo-logo">
          <span className="eo-logo-e">E</span>
          <span className="eo-logo-o">O</span>
        </div>
        <div className="eo-actions print-hide">
          <span className="eo-privacy">Private to you only</span>
          {isCompleted ? (
            <button
              type="button"
              onClick={() => handleDownloadPdf(false)}
              className="eo-btn eo-btn-primary"
            >
              Download PDF
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="eo-btn eo-btn-secondary"
              >
                Clear
              </button>
              {data.id && (
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(true)}
                  className="eo-btn eo-btn-secondary"
                  title="Download current draft as PDF (labeled DRAFT)"
                >
                  Draft PDF
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || completing}
                className="eo-btn eo-btn-secondary"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving || completing}
                className="eo-btn eo-btn-primary"
              >
                {completing ? "Completing..." : "Complete & Generate PDF"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
