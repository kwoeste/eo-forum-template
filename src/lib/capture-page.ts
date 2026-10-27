export async function captureVisiblePage(): Promise<File> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const target =
    (document.querySelector("main") as HTMLElement | null) ?? document.body;
  const restored = hideHeavyElements();

  try {
    const canvas = await html2canvas(target, {
      useCORS: false,
      allowTaint: false,
      logging: false,
      scale: 1,
      backgroundColor: "#fafaf9",
      width: Math.min(target.clientWidth || window.innerWidth, window.innerWidth),
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        clonedDoc
          .querySelectorAll("iframe, nextjs-portal, video, canvas")
          .forEach((node) => node.remove());
      },
      ignoreElements: (element) => shouldSkipCaptureElement(element),
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    if (!blob) {
      throw new Error("Could not capture the page.");
    }

    return new File([blob], `page-screenshot-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    restored();
  }
}

function hideHeavyElements(): () => void {
  const changed: Array<{ element: HTMLElement; visibility: string }> = [];
  document
    .querySelectorAll("iframe, nextjs-portal, video")
    .forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      changed.push({ element: node, visibility: node.style.visibility });
      node.style.visibility = "hidden";
    });

  return () => {
    changed.forEach(({ element, visibility }) => {
      element.style.visibility = visibility;
    });
  };
}

function shouldSkipCaptureElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (
    element.hasAttribute("data-bug-report-ui") ||
    element.closest("[data-bug-report-ui]")
  ) {
    return true;
  }
  const tag = element.tagName;
  if (tag === "IFRAME" || tag === "NEXTJS-PORTAL" || tag === "VIDEO") {
    return true;
  }
  if (element instanceof HTMLImageElement && isCrossOriginSrc(element.src)) {
    return true;
  }
  return (
    element.id === "clerk-components" ||
    element.id.startsWith("clerk-") ||
    element.id.startsWith("next-dev")
  );
}

function isCrossOriginSrc(src: string): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  try {
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
}
