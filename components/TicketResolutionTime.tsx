"use client";

import { useState } from "react";
import { updateTicketResolutionTime } from "@/app/actions";
import { fmtDuration } from "@/lib/dates";

export function TicketResolutionTime({
  id, resolutionMinutes, autoMinutes,
}: { id: number; resolutionMinutes: number | null; autoMinutes: number | null }) {
  const [mode, setMode] = useState<"auto" | "manual">(resolutionMinutes != null ? "manual" : "auto");
  const [hours, setHours] = useState(resolutionMinutes != null ? Math.floor(resolutionMinutes / 60) : 0);
  const [minutes, setMinutes] = useState(resolutionMinutes != null ? resolutionMinutes % 60 : 0);

  const effective = mode === "manual" ? hours * 60 + minutes : autoMinutes;

  return (
    <form action={updateTicketResolutionTime} className="restime">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="restime-head">
        <span className="restime-label">Tiempo de resolución</span>
        <span className="restime-value mono">{effective != null ? fmtDuration(effective) : "— sin resolver aún —"}</span>
      </div>
      <div className="restime-modes">
        <label className="restime-opt">
          <input type="radio" name="mode-radio" checked={mode === "auto"} onChange={() => setMode("auto")} />
          Automático{autoMinutes != null ? ` (${fmtDuration(autoMinutes)}, creado → resuelto)` : " (se calcula al resolver)"}
        </label>
        <label className="restime-opt">
          <input type="radio" name="mode-radio" checked={mode === "manual"} onChange={() => setMode("manual")} />
          Manual
        </label>
      </div>
      {mode === "manual" && (
        <div className="restime-manual">
          <input
            type="number" name="hours" min={0} value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            className="restime-input"
          />
          <span className="pv-meta">h</span>
          <input
            type="number" name="minutes" min={0} max={59} value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
            className="restime-input"
          />
          <span className="pv-meta">m</span>
        </div>
      )}
      <button type="submit" className="btn sm">Guardar</button>
    </form>
  );
}
