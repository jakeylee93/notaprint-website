"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/artwork/intake";
import { initArtwork, uploadArtwork, useArtwork, clearArtworkError } from "@/state/artwork";
import { hydrateBasket } from "@/state/basket";
import { hydrateDesigns } from "@/state/designs";

interface ShellApi {
  openFilePicker: () => void;
  notify: (message: string, tone?: "info" | "alert") => void;
}

const ShellContext = createContext<ShellApi>({ openFilePicker: () => undefined, notify: () => undefined });

export function useShell() {
  return useContext(ShellContext);
}

/**
 * Client shell: hydrates persisted state, owns the single hidden file input, accepts a logo
 * dropped anywhere on the page, and shows short status messages.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "alert" } | null>(null);
  const artwork = useArtwork();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, tone: "info" | "alert" = "info") => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), tone === "alert" ? 9000 : 4200);
  }, []);

  useEffect(() => {
    hydrateBasket();
    hydrateDesigns();
    void initArtwork();
  }, []);

  useEffect(() => {
    if (artwork.error) {
      notify(artwork.error, "alert");
      clearArtworkError();
    }
  }, [artwork.error, notify]);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const ok = await uploadArtwork(file);
      if (ok) notify("Logo ready. It now appears on every product.");
    },
    [notify],
  );

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void handleFile(e.dataTransfer?.files?.[0]);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFile]);

  const api: ShellApi = {
    openFilePicker: () => inputRef.current?.click(),
    notify,
  };

  return (
    <ShellContext.Provider value={api}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="logo-input"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div className="stack-m">
            <p className="display-l">Drop your logo</p>
            <p className="muted">PNG, JPEG or SVG. It stays on this device.</p>
          </div>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {artwork.status === "processing" ? "Preparing your logo" : ""}
      </div>
      {toast && (
        <div className={`toast ${toast.tone === "alert" ? "alert" : ""}`} role={toast.tone === "alert" ? "alert" : "status"}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            Close
          </button>
        </div>
      )}
    </ShellContext.Provider>
  );
}
