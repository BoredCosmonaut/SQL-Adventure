import "express-session";

declare module "express-session" {
  interface SessionData {
    playerName: string;
    retired:boolean;
  }
}