import { gamePool } from "../db";
import { buildNarration } from "../services/narration";

export interface Player {
  name:string;
  password_hash: string;
  location_slug:string;
  hp:number;
  gold:number;
  retired:boolean;
}

export type CountKey = 
  |'gifts'
  |'fishing'
  |'sales'
  |'golem'
  |'hazards'
  |'riddles'
  |'uses'
  |'visits'
  |'door'
  |'digs'
  |'socket'
  |'titles'
  |'retirements';

export interface PlayerSnapshot {
  location_slug: string;
  hp:number;
  gold:number;
  inventory:{item_slug:string; quantity:number}[];
  counts: Record<CountKey,number>;
} 

const EVENT_COUNTS: {key:CountKey; sql:string}[] = [
  { key:'gifts',sql: "SELECT COUNT(*) FROM npc_gifts WHERE player_name = $1"},
  { key: 'fishing', sql: "SELECT COUNT(*) FROM fishing_attempts WHERE player_name = $1"},
  { key: 'sales',   sql: "SELECT COUNT(*) FROM sales WHERE player_name = $1" },
  { key: 'golem',   sql: "SELECT COUNT(*) FROM golem_attacks WHERE player_name = $1" },
  { key: 'hazards', sql: "SELECT COUNT(*) FROM job_events WHERE player_name = $1 AND hazard_hit = true" },
  { key: 'riddles', sql: "SELECT COUNT(*) FROM riddle_attempts WHERE player_name = $1" },
  { key: 'uses',    sql: "SELECT COUNT(*) FROM item_uses WHERE player_name = $1" },
  { key: 'visits',  sql: "SELECT COUNT(*) FROM location_visits WHERE player_name = $1" },
  { key: 'door',    sql: "SELECT COUNT(*) FROM tower_door_attempts WHERE player_name = $1" },
  { key: 'digs',    sql: "SELECT COUNT(*) FROM job_events WHERE player_name = $1 AND event_type = 'dig'" },
  { key: 'socket',  sql: "SELECT COUNT(*) FROM tower_socket WHERE player_name = $1" },
  { key: 'titles',  sql: "SELECT COUNT(*) FROM player_titles WHERE player_name = $1" },
  { key: 'retirements', sql: "SELECT COUNT(*) FROM retirements WHERE player_name = $1" }
];

export async function createPlayer(name:string,passwordHash:string):Promise<Player> {
  const client = await gamePool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [name]
    );

    const result = await client.query(
      "INSERT INTO players(name, password_hash) VALUES ($1, $2) RETURNING *",
      [name, passwordHash]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

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

export async function runPlayerQuery(playerName:string,sql:string):Promise<any[]> {
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
    client.release();
  }
}

export async function snapshotPlayer(playerName: string): Promise<PlayerSnapshot | null> {
  const client = await gamePool.connect();
  try {
    await client.query("BEGIN");
 
    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );
 
    const playerRes = await client.query(
      "SELECT location_slug, hp, gold FROM players WHERE name = $1",
      [playerName]
    );
 
    if (!playerRes.rows[0]) {
      await client.query("COMMIT");
      return null;
    }
 
    const invRes = await client.query(
      "SELECT item_slug, quantity FROM inventory WHERE player_name = $1",
      [playerName]
    );
 
    const counts = {} as Record<CountKey, number>;
    for (const { key, sql } of EVENT_COUNTS) {
      const res = await client.query(sql, [playerName]);
      counts[key] = Number(res.rows[0].count);
    }
 
    await client.query("COMMIT");
 
    return {
      location_slug: playerRes.rows[0].location_slug,
      hp: playerRes.rows[0].hp,
      gold: playerRes.rows[0].gold,
      inventory: invRes.rows,
      counts,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function diffSnapshots(
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  const client = await gamePool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );

    const lines = await buildNarration(client,playerName,before,after);

    await client.query('COMMIT');
    return lines;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release()
  }
};
 
