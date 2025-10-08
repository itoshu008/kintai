// src/backupsHealth.ts
import type express from "express";

export function registerBackupsHealth(app: express.Application) {
  // 必ず静的配信・catch-all より前に呼ばれる位置で登録される想定
  app.get("/api/admin/backups/health", (_req, res) => {
    try {
      const enabled = (process.env.BACKUP_ENABLED ?? "1") !== "0";
      const intervalMinutes = parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? "60", 10) || 60;
      const maxKeep = parseInt(process.env.BACKUP_MAX_KEEP ?? "24", 10) || 24;
      res.json({ ok: true, enabled, intervalMinutes, maxKeep });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
}

export function registerBasicHealth(app: express.Application) {
  app.get("/__ping", (_req, res) => res.type("text/plain").send("pong"));
  app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
}
