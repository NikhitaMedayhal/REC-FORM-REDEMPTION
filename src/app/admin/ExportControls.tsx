"use client";

import { useState } from "react";

export default function ExportControls() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) {
        throw new Error("export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `applications-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("could not export. try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn" onClick={handleExport} disabled={exporting}>
        {exporting ? "exporting..." : "export_xlsx"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
