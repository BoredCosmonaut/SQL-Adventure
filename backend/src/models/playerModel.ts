import { gamePool } from "../db";
import { buildNarration } from "../services/narration";

export interface Player{
  name: string;
  password_hash:string;
  location_slug: string;
  hp:number;
  gold:number;
}

export interface PlayerSnapshot{
  location_slug:string;
  hp:number;
  gold:number;
  inventory:{item_slug:string; quantity:number}[];
  giftCount: number;
  fishAttemptCount: number;
  salesCount: number;
  golemCount: number;
  hazardHitCount: number;
  riddleCount: number;
  useCount: number;
  visitCount: number;
  doorAttemptCount: number;
}

export async function createPlayer(name:string, passwordHash:string):Promise<Player> {
  const client = await gamePool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
        "SELECT set_config('app.current_player', $1, true)",
        [name]
    );

    const result = await client.query<Player>(
      "INSERT INTO players(name, password_hash) VALUES ($1, $2) RETURNING *",
      [name, passwordHash]
    );

    await client.query("COMMIT");
    return result.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally{
    client.release();
  }
};

export async function findPlayer(name: string): Promise<Player | null> {
  const client = await gamePool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [name]
    );

    const result = await client.query<Player>(
      "SELECT * FROM players WHERE name = $1",
      [name]
    );

    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function runPlayerQuery(playerName:string, sql:string):Promise<any[]> {
  const client = await gamePool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );
    const result = await client.query(sql);

    await client.query("COMMIT");
    return result.rows;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release()
  }
}

export async function snapshotPlayer(playerName: string):Promise<PlayerSnapshot | null> {
  const client = await gamePool.connect();
  try{
    await client.query("BEGIN");

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );

    const playerRes = await client.query(
      "SELECT location_slug, hp, gold FROM players WHERE name = $1",
      [playerName]
    );

    if(!playerRes.rows[0]) {
      await client.query("COMMIT");
      return null;
    }

    const invRes = await client.query(
      "SELECT item_slug, quantity FROM inventory WHERE player_name = $1",
      [playerName]
    );
const giftRes = await client.query(
      "SELECT COUNT(*) FROM npc_gifts WHERE player_name = $1",
      [playerName]
    );
 
    const fishRes = await client.query(
      "SELECT COUNT(*) FROM fishing_attempts WHERE player_name = $1",
      [playerName]
    );
 
    const salesRes = await client.query(
      "SELECT COUNT(*) FROM sales WHERE player_name = $1",
      [playerName]
    );
 
    const golemRes = await client.query(
      "SELECT COUNT(*) FROM golem_attacks WHERE player_name = $1",
      [playerName]
    );
 
    const riddleRes = await client.query(
      "SELECT COUNT(*) FROM riddle_attempts WHERE player_name = $1",
      [playerName]
    );
 
    const hazardRes = await client.query(
      "SELECT COUNT(*) FROM job_events WHERE player_name = $1 AND hazard_hit = true",
      [playerName]
    );
 
    const usesRes = await client.query(
      "SELECT COUNT(*) FROM item_uses WHERE player_name = $1",
      [playerName]
    );

    const visitRes = await client.query(
      "SELECT COUNT(*) FROM location_visits WHERE player_name = $1",
      [playerName]
    );

    const doorRes = await client.query(
      "SELECT COUNT(*) FROM tower_door_attempts WHERE player_name = $1",
      [playerName]
    );
 
    await client.query("COMMIT");

    return{
      location_slug: playerRes.rows[0].location_slug,
      hp: playerRes.rows[0].hp,
      gold: playerRes.rows[0].gold,
      inventory: invRes.rows,
      giftCount: Number(giftRes.rows[0].count),
      fishAttemptCount: Number(fishRes.rows[0].count),
      salesCount: Number(salesRes.rows[0].count),
      golemCount: Number(golemRes.rows[0].count),
      hazardHitCount: Number(hazardRes.rows[0].count),
      riddleCount: Number(riddleRes.rows[0].count),
      useCount: Number(usesRes.rows[0].count),
      visitCount: Number(visitRes.rows[0].count),
      doorAttemptCount: Number(doorRes.rows[0].count)
    };
  } catch(err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export async function diffSnapshots(
  playerName:string,
  before:PlayerSnapshot,
  after:PlayerSnapshot
):Promise<string[]> {
  const client = await gamePool.connect();
  try{
    await client.query("BEGIN");

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );

    const lines = await buildNarration(client,playerName,before,after);
    await client.query("COMMIT");
    return lines;
  } catch(err) {
    await client.query("ROLLBACK");
    throw err;
  } finally{
    client.release();
  }
}