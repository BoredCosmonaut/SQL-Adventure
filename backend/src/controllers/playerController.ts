import { Request, Response } from "express";
import { createPlayer, findPlayer,getRetirementSummary  } from "../models/playerModel";
import bcrypt from "bcrypt";


const NAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;


export async function registerPlayer(req: Request, res: Response) {
  const { name, password } = req.body as { name?: string; password?: string };

  if (!name || !NAME_PATTERN.test(name)) {
    return res.status(400).json({
      error: "Name must be 3-20 characters: letters, numbers, _ or - only.",
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const player = await createPlayer(name, passwordHash);

    req.session.playerName = player.name;
    req.session.retired = false;
    res.json({
      playerName: player.name,
      message: `Welcome, ${player.name}. On the horizon, a storm that should not exist grows larger by the hour — Khargazim will not survive it, and no one seems to know what to do. You are not anyone special. You are a farm worker with ambitions far above your station. Go and make them real. Try: SELECT description FROM locations WHERE slug = 'farm';`,
    });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: `"${name}" is already taken.` });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong creating your character." });
  }
}

export async function loginPlayer(req: Request, res: Response) {
  const { name, password } = req.body as { name?: string; password?: string };

  if (!name || !NAME_PATTERN.test(name)) {
    return res.status(400).json({ error: "Invalid name." });
  }

  if (!password) {
    return res.status(400).json({ error: "Password required." });
  }

  try {
    const player = await findPlayer(name);

    if (!player) {
      return res.status(404).json({ error: `No character named "${name}" exists.` });
    }

    const passwordMatches = await bcrypt.compare(password, player.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    req.session.playerName = player.name;
    req.session.retired = player.retired;
    if (player.retired) {
      const summary = await getRetirementSummary(player.name);
      return res.json({
        playerName: player.name,
        retired: true,
        message: `${player.name}'s story is finished.`,
        ...summary,
      });
    }
    res.json({
      playerName: player.name,
      message: `Welcome back, ${player.name}. You pick up where you left off.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
}


export async function logoutPlayer(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong logging you out." });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "You set your work aside for now." });
  });
}

export async function getCurrentPlayer(req:Request,res:Response) {
  const playerName = req.session.playerName;

  if(!playerName){
    return res.status(401).json({error:'Not logged in'});
  }

  try {
    const player = await findPlayer(playerName);
    if(!player) {
      req.session.destroy(() =>{});
      return res.status(401).json({error:'Session no longer valid'});
    }

    if(player.retired) {
      const summary = await getRetirementSummary(player.name);
      return res.json({
        playerName:player.name,
        retired:true,
        message:`${player.name}'s story is finished`,
        ...summary
      });
    }

    res.json({
      playerName:player.name,
      message:`Welcome back ${player.name}.`
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong checking your session." });
  }
}
