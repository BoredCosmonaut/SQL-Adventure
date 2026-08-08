import {gamePool} from '../db';

export interface Player {
  name: string,
  password_hash: string,
  location_slug: string,
  hp: number,
  gold: number,
};

export interface PlayerSnapshot {
  location_slug: string;
  hp: number;
  gold: number;
  inventory: { item_slug: string; quantity: number }[];
  giftCount: number;
  fishAttemptCount: number;
  salesCount: number;
  golemCount:number;
  hazardHitCount: number;
}

const  GIFT_REACTIONS: Record<string,Record<string,string>> = {
  tavern_cat:{
    fish:"Scruffy pounces on the fish immediately, purring loudly.",
  },
};

function getGiftReaction(npcSlug:string,itemSlug:string):string {
  return GIFT_REACTIONS[npcSlug]?.[itemSlug] ?? "Your gift is warmly accepted";
};


const cave_in_messages = [
  "The ceiling groans and showers you with rock and dust. You stumble back, hurt.",
  "A support beam gives way behind you. Stone crashes down — you barely get clear in time.",
  "The tunnel shudders. For a moment, you catch a glimpse of something strange embedded in the rock — a cluster of oddly cubic shapes, almost too perfectly square to be natural. Then the dust settles and it's gone.",
];

function getCaveInMessage(): string {
  return cave_in_messages[Math.floor(Math.random() * cave_in_messages.length)];
}


export async function createPlayer(name: string, passwordHash: string): Promise<Player> {
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

export async function runPlayerQuery(playerName:string,sql:string): Promise <any[]> {
    const client = await gamePool.connect();

    try {
        await client.query("BEGIN");
        await client.query(
            "SELECT set_config('app.current_player',$1,true)",
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


export async function snapshotPlayer(playerName:string): Promise<PlayerSnapshot | null> {
  const client = await gamePool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );
    
    const playerRes = await client.query(
      "SELECT location_slug, hp, gold FROM players WHERE name = $1",
      [playerName]
    );

    if(!playerRes.rows[0]) {
      await client.query('COMMIT');
      return null;
    };

    const invRes = await client.query(
      "SELECT item_slug, quantity FROM inventory WHERE player_name = $1",
      [playerName]
    );

    const giftRes = await client.query(
      "SELECT COUNT(*) FROM npc_gifts WHERE player_name = $1",
      [playerName]
    )

    const fishRes = await client.query(
      "SELECT COUNT(*) FROM fishing_attempts WHERE player_name = $1",
      [playerName]
    );

    const salesRes = await client.query('SELECT COUNT(*) FROM SALES WHERE player_name = $1', 
      [playerName]
    );

    const golemRes = await client.query(
      "SELECT COUNT(*) FROM golem_attacks WHERE player_name = $1",
      [playerName]
    );

    const hazardRes = await client.query(
      "SELECT COUNT(*) FROM job_events WHERE player_name = $1 AND hazard_hit = true",
      [playerName]
    )

    await client.query('COMMIT');
    return {
      location_slug: playerRes.rows[0].location_slug,
      hp: playerRes.rows[0].hp,
      gold: playerRes.rows[0].gold,
      inventory: invRes.rows,
      giftCount: Number(giftRes.rows[0].count),
      fishAttemptCount: Number(fishRes.rows[0].count),
      salesCount: Number(salesRes.rows[0].count),
      golemCount: Number(golemRes.rows[0].count),
      hazardHitCount: Number(hazardRes.rows[0].count)
    
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release()
  }
}

export async function diffSnapshots(playerName: string, before: PlayerSnapshot, after: PlayerSnapshot): Promise<string[]> {
  const lines: string[] = [];
  const client = await gamePool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_player', $1, true)",
      [playerName]
    );

    if (before.location_slug !== after.location_slug) {
      const res = await client.query(
        "SELECT name, description FROM locations WHERE slug = $1",
        [after.location_slug]
      );
      const loc = res.rows[0];
      if (loc) lines.push(`You arrive at ${loc.name}. ${loc.description}`);
      if(after.location_slug === 'hollow_vein') {
        const hasTome = after.inventory.some(i => i.item_slug === 'old_tome');
        if(hasTome) {
          lines.push("You recall the tome's words about sealed halls beneath this very mine. Perhaps there's something worth digging for here.")
        }
      }
    
    }

    if (before.hp !== after.hp) {
      const delta = after.hp - before.hp;
      if (after.hp <= 0) {
        const res = await client.query(
          `SELECT j.death_message FROM job_events je
           JOIN jobs j ON j.slug = je.job_slug
           WHERE je.player_name = $1 ORDER BY je.created_at DESC LIMIT 1`,
          [playerName]
        );
        const message = res.rows[0]?.death_message ?? "You collapse, your journey at an end.";
        lines.push(message);
      } else if(after.hazardHitCount > before.hazardHitCount) {
        lines.push(getCaveInMessage())
      }
      
      else {
        lines.push(delta > 0 ? `You feel better. (+${delta} HP)` : `You take damage. (${delta} HP)`);
      }
    }

    if (before.gold !== after.gold) {
      const delta = after.gold - before.gold;
      lines.push(delta > 0 ? `You gain ${delta} gold.` : `You lose ${-delta} gold.`);
    }

    const beforeMap = new Map(before.inventory.map(i => [i.item_slug, i.quantity]));
    const afterMap = new Map(after.inventory.map(i => [i.item_slug, i.quantity]));
    const allSlugs = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    if (after.giftCount > before.giftCount) {
      const res = await client.query(
        `SELECT npc_slug, item_slug FROM npc_gifts
         WHERE player_name = $1
         ORDER BY given_at DESC LIMIT 1`,
        [playerName]
      );
      const lastGift = res.rows[0];
      if (lastGift) {
        lines.push(getGiftReaction(lastGift.npc_slug, lastGift.item_slug));
      }
    }

    if (after.fishAttemptCount > before.fishAttemptCount) {
      const res = await client.query(
        `SELECT success FROM fishing_attempts
        WHERE player_name = $1
        ORDER BY created_at DESC LIMIT 1`,
        [playerName]
      );
      const lastAttempt = res.rows[0];
      if (lastAttempt) {
        lines.push(lastAttempt.success
          ? "You feel a tug on the line — got one!"
          : "The line goes still. Nothing this time.");
      }
    }

    const didSell = after.salesCount > before.salesCount;
    const didGift = after.giftCount > before.giftCount;
    for(const slug of allSlugs) {
      const beforeQty = beforeMap.get(slug) ?? 0;
      const afterQty = afterMap.get(slug) ?? 0;
      if(afterQty === beforeQty) continue;

      const res = await client.query("SELECT name FROM items WHERE slug = $1", [slug]);
      const itemName = res.rows[0]?.name ?? slug;

      if(afterQty > beforeQty) {
        lines.push(`You pick up ${itemName}`);
      } else if (didSell) {
        lines.push(`You sell ${itemName}.`);
      } else if (didGift) {
        lines.push(`You give away ${itemName}.`);
      } else {
        lines.push(`You lose ${itemName}.`);
      }

    }

    if(after.golemCount > before.golemCount) {
      const res = await client.query(
        `SELECT success FROM golem_attacks
        WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
        [playerName]
      );
      const lastFight = res.rows[0];
      if(lastFight) {
        lines.push(lastFight.success 
          ? "Your steel sword bites true. The golem crumbles to rubble, leaving only its core behind."
          : "You swing your sword yet it does no damage.Stone fists crash down before you can react. You stagger back, badly hurt.");
      }
    }

    await client.query("COMMIT");
    return lines;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}