import type express from "express";

export function registerBackupsHealth(app: express.Application) {
  app.get("/api/admin/backups/health", (_req, res) => {
    try {
      const enabled = (process.env.BACKUP_ENABLED ?? "1") !== "0";
      const intervalMinutes = Number.parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? "60") || 60;
      const maxKeep = Number.parseInt(process.env.BACKUP_MAX_KEEP ?? "24") || 24;
      res.json({ ok: true, enabled, intervalMinutes, maxKeep });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
}
