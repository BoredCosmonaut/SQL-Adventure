import { Request, Response } from "express";
import { runPlayerQuery, snapshotPlayer, diffSnapshots } from "../models/playerModel";
import { containsForbiddenSql } from "../utils/sqlGuard";

export async function runQuery(req: Request, res: Response) {
  const playerName = req.session.playerName;

  if (!playerName) {
    return res.status(401).json({ error: "You must register or log in first." });
  }
  
  if (req.session.retired) {
    return res.status(403).json({ error: "Your story is finished. This character rests." });
  }

  const { sql } = req.body as { sql?: string };

  if (!sql || typeof sql !== "string" || !sql.trim()) {
    return res.status(400).json({ error: "No SQL statement provided." });
  }

  const forbidden = containsForbiddenSql(sql);
  if (forbidden) {
    return res.status(403).json({
      error: `You don't have the power to "${forbidden}" the world around you.`,
    });
  }

  try {
    const before = await snapshotPlayer(playerName);
    const  rows  = await runPlayerQuery(playerName, sql);
    const after = await snapshotPlayer(playerName);

    const narration = before && after ? await diffSnapshots(playerName, before, after) : [];

    res.json({ rows, narration });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Your query failed." });
  }
}