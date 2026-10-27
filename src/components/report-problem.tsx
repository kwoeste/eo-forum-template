"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { prepareUploadFile } from "@/lib/prepare-upload-file";
import {
  BUG_REPORT_MAX_DESCRIPTION,
  BUG_REPORT_MAX_SCREENSHOT_BYTES,
  BUG_REPORT_MIN_DESCRIPTION,
  isAllowedScreenshotType,
} from "@/lib/bug-report";

type DialogState = "form" | "submitting" | "success" | "error";

export function ReportProblemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M8 2l1.5 3" />
      <path d="M16 2l-1.5 3" />
      <path d="M9 9v1" />
      <path d="M15 9v1" />
      <path d="M12 16v-3" />
      <rect x="8" y="6" width="8" height="12" rx="4" />
      <path d="M8 10H5a2 2 0 0 0 0 4h2" />
      <path d="M16 10h3a2 2 0 0 1 0 4h-2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function ReportProblemTrigger({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        compact
          ? "p-1.5 rounded text-stone-400 hover:text-white hover:bg-stone-800"
          : "px-2.5 py-1.5 text-xs font-medium rounded text-stone-400 hover:text-white hover:bg-stone-800"
      }
      aria-label="Report a problem"
    >
      {compact ? <ReportProblemIcon /> : "Report a problem"}
    </button>
  );
}

export function ReportProblemDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const titleId = useId();
  const previewUrlRef = useRef<string | null>(null);
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [state, setState] = useState<DialogState>("form");
  const [error, setError] = useState<string | null>(null);

  const replacePreview = useCallback((nextUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }, []);

  const attachScreenshot = useCallback(
    async (file: File) => {
      if (
        !isAllowedScreenshotType(file.type) &&
        !file.type.startsWith("image/")
      ) {
        setError("Please attach a screenshot image.");
        return;
      }
      if (file.size > BUG_REPORT_MAX_SCREENSHOT_BYTES) {
        setError("Screenshot is too large. Maximum size is 15MB.");
        return;
      }

      const prepared = await prepareUploadFile(file);
      replacePreview(URL.createObjectURL(prepared));
      setScreenshot(prepared);
      setError(null);
    },
    [replacePreview]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !capturing) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    if (!capturing) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, capturing]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || capturing) {
      return;
    }

    async function onPaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (!file) {
        return;
      }
      event.preventDefault();
      await attachScreenshot(file);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open, capturing, attachScreenshot]);

  function clearScreenshot() {
    replacePreview(null);
    setScreenshot(null);
  }

  async function handleCapture() {
    setError(null);
    flushSync(() => {
      setCapturing(true);
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    try {
      const { captureVisiblePage } = await import("@/lib/capture-page");
      const file = await captureVisiblePage();
      await attachScreenshot(file);
    } catch {
      setError(
        "Could not capture the page. You can still upload or paste a screenshot."
      );
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = description.trim();
    if (
      trimmed.length < BUG_REPORT_MIN_DESCRIPTION ||
      trimmed.length > BUG_REPORT_MAX_DESCRIPTION
    ) {
      setError(
        `Please describe the problem in ${BUG_REPORT_MIN_DESCRIPTION}–${BUG_REPORT_MAX_DESCRIPTION} characters.`
      );
      return;
    }

    setState("submitting");
    setError(null);

    const body = new FormData();
    body.set("description", trimmed);
    body.set("pagePath", pathname || "/");
    body.set("pageUrl", window.location.href);
    if (screenshot) {
      body.set("screenshot", screenshot);
    }

    try {
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setState("error");
        setError(data.error || "Could not send the report.");
        return;
      }

      setState("success");
      setDescription("");
      clearScreenshot();
    } catch {
      setState("error");
      setError("Could not send the report. Try again.");
    }
  }

  if (!open) {
    return null;
  }

  if (capturing) {
    return (
      <div
        data-bug-report-ui
        className="fixed top-4 left-1/2 z-[11000] -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg"
        role="status"
      >
        Capturing this page…
      </div>
    );
  }

  return (
    <div
      data-bug-report-ui
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4 text-stone-900"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50"
        aria-label="Close report dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-full max-w-lg max-h-[min(92dvh,40rem)] flex-col overflow-hidden rounded-xl bg-white shadow-xl border border-stone-200"
      >
        <div className="shrink-0 border-b border-stone-200 px-5 py-4 bg-white">
          <h2 id={titleId} className="text-lg font-semibold text-stone-900">
            {state === "success" ? "Got it" : "Report a problem"}
          </h2>
          {state !== "success" ? (
            <p className="text-sm text-stone-800 mt-1 break-all">
              Page:{" "}
              <span className="font-semibold text-stone-900">
                {pathname || "/"}
              </span>
            </p>
          ) : null}
        </div>

        {state === "success" ? (
          <div className="flex flex-1 flex-col justify-between gap-4 px-5 py-4">
            <p className="text-sm text-stone-600">
              The site admin will take a look. Your screenshot and notes were saved.
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label
                  htmlFor="bug-report-description"
                  className="block text-sm font-medium text-stone-800 mb-1"
                >
                  What happened?
                </label>
                <textarea
                  id="bug-report-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full min-h-28 text-stone-900 bg-white placeholder:text-stone-400"
                  placeholder="What did you expect, and what went wrong?"
                  maxLength={BUG_REPORT_MAX_DESCRIPTION}
                  autoFocus
                  required
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-stone-800 mb-2">
                  Screenshot{" "}
                  <span className="font-normal text-stone-500">(optional)</span>
                </p>
                {previewUrl ? (
                  <div className="space-y-2">
                    {/* User-chosen preview; next/image does not accept blob URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Screenshot preview"
                      className="max-h-48 w-full object-contain rounded-md border border-stone-200 bg-stone-50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost text-sm"
                        onClick={() => void handleCapture()}
                      >
                        Capture again
                      </button>
                      <label className="btn btn-ghost text-sm cursor-pointer">
                        Replace with upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void attachScreenshot(file);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-ghost text-sm"
                        onClick={clearScreenshot}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-primary text-sm gap-1.5"
                        onClick={() => void handleCapture()}
                      >
                        <CameraIcon />
                        Capture this page
                      </button>
                      <label className="btn btn-ghost text-sm cursor-pointer">
                        Upload image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void attachScreenshot(file);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-stone-500">
                      Capture hides this window first, then saves a picture of
                      the page. You can also upload or paste a screenshot.
                    </p>
                  </div>
                )}
              </div>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}
            </div>

            <div className="shrink-0 border-t border-stone-200 px-5 py-3 flex justify-end gap-2 bg-white">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={state === "submitting"}
              >
                {state === "submitting" ? "Sending..." : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
