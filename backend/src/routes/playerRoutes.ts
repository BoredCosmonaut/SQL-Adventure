import { Router } from "express";
import { registerPlayer,loginPlayer,logoutPlayer } from "../controllers/playerController";
import { runQuery } from "../controllers/queryController";
export const playerRouter = Router();

playerRouter.post("/register", registerPlayer);
playerRouter.post("/login", loginPlayer)
playerRouter.post('/query',runQuery);
playerRouter.post("/logout", logoutPlayer);
