import { PoolClient } from "pg";
import { PlayerSnapshot,CountKey } from "../models/playerModel";


function happened(before:PlayerSnapshot,after:PlayerSnapshot, key:CountKey): boolean {
    return after.counts[key] > before.counts[key];
};

function timesHappened(before:PlayerSnapshot,after:PlayerSnapshot,key:CountKey): number {
    return after.counts[key] - before.counts[key];
};

const giftReactions: Record<string,Record<string,string>> = {
    scruffy:{
        fish: "Scruffy pounces on the fish immediately, purring loudly.",
    },
    bruni:{
        dragon_ale:"Bruni cracks the cask, sniffs, and goes very quiet. Then he drinks. \"...Where in the deep did you get this?\" He waves at a crate without looking away from the cup. \"Take them. Take two, I don't care.\""
    },
};

function getGiftReaction(npcSlug:string,itemSlug:string): string {
    return giftReactions[npcSlug]?.[itemSlug] ?? "Your gift is accepted";
};

const caveInMessages = [
  "The ceiling groans and showers you with rock and dust. You stumble back, hurt.",
  "A support beam gives way behind you. Stone crashes down — you barely get clear in time.",
  "The tunnel shudders. For a moment, you catch a glimpse of something strange embedded in the rock — a cluster of oddly cubic shapes, almost too perfectly square to be natural. Then the dust settles and it's gone.",
];

function getCaveInMessage(): string {
    return caveInMessages[Math.floor(Math.random() * caveInMessages.length)];
};

export async function narrateLocation(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
    if(before.location_slug === after.location_slug) return [];

    const lines: string[] = [];
    const isFirstVisit = happened(before,after,"visits");

    if(after.location_slug === 'tower' && before.location_slug === 'mountains' && isFirstVisit) {
        lines.push("You wedge the charges into the boulder's base and take cover. The blast shakes the whole pass — when the dust clears, the way is open.");
    }

    const res = await client.query(
    "SELECT name, description FROM locations WHERE slug = $1",
    [after.location_slug]
    );

    const loc = res.rows[0];
    if(loc) lines.push(`You arrive at ${loc.name}. ${loc.description}`);

    if(after.location_slug === 'hollow_vein') {
        const hasTomme = after.inventory.some(i => i.item_slug === 'old_tome');
        if(hasTomme) {
            lines.push("You recall the tome's words about sealed halls beneath this very mine. Perhaps there's something worth digging for here.");
        }
    }

    if(after.location_slug === 'lemnian_catacombs' && isFirstVisit) {
        lines.push("Carved into the far wall, in letters that hurt to look at, a single word: VEKTHANEIROS. You do not know how you know it is a name, but you do.");
        lines.push("It seems like the sort of thing worth writing down.");
    }

    return lines;
};

export async function narrateHealth(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
    if(before.hp === after.hp) return [];

    const delta = after.hp - before.hp;

    if(after.hp<= 0 ) {
        const res = await client.query(
        `SELECT j.death_message FROM job_events je
        JOIN jobs j ON j.slug = je.job_slug
        WHERE je.player_name = $1 ORDER BY je.created_at DESC LIMIT 1`,
        [playerName]
        );
        return [res.rows[0]?.death_message ?? "You collapse."]
    };

    if(happened(before,after,'hazards')) {
        return [getCaveInMessage()];
    }

    return [delta > 0
        ? `You feel better. (+${delta} HP)`
        : `You take damage. (${delta} HP)`
    ];
}

export async function narrateGold(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
):Promise<string[]> {
    if(before.gold === after.gold) return[];

    const delta = after.gold - before.gold;

    return [delta > 0 ? `You gain ${delta} gold.` : `You lose ${-delta} gold.`];
} 

export async function narrateInventory(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  const lines: string[] = [];
 
  const beforeMap = new Map(before.inventory.map(i => [i.item_slug, i.quantity]));
  const afterMap = new Map(after.inventory.map(i => [i.item_slug, i.quantity]));
  const allSlugs = new Set([...beforeMap.keys(), ...afterMap.keys()]);
 
  // Why did an item leave the inventory? Checked once, reused for every slug.
  const didSell = happened(before, after, 'sales');
  const didGift = happened(before, after, 'gifts');
  const didUse = happened(before, after, 'uses');
 
  for (const slug of allSlugs) {
    const beforeQty = beforeMap.get(slug) ?? 0;
    const afterQty = afterMap.get(slug) ?? 0;
    if (afterQty === beforeQty) continue;
 
    const res = await client.query("SELECT name FROM items WHERE slug = $1", [slug]);
    const itemName = res.rows[0]?.name ?? slug;
 
    if (afterQty > beforeQty) {
      lines.push(`You pick up ${itemName}.`);
    } else if (didSell) {
      lines.push(`You sell ${itemName}.`);
    } else if (didGift) {
      lines.push(`You give away ${itemName}.`);
    } else if (didUse) {
      lines.push(`You use ${itemName}.`);
    } else {
      lines.push(`You lose ${itemName}.`);
    }
  }
 
  return lines;
}


export async function narrateGift(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot

): Promise<string[]> {
    if (!happened(before, after, 'gifts')) return [];
    
    const res = await client.query(
        `SELECT npc_slug, item_slug FROM npc_gifts
        WHERE player_name = $1
        ORDER BY given_at DESC LIMIT 1`,
        [playerName]
    );
    const lastGift = res.rows[0];
    if (!lastGift) return [];
    
    return [getGiftReaction(lastGift.npc_slug, lastGift.item_slug)];
}

export async function narrateFishing(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'fishing')) return [];
 
  const res = await client.query(
    `SELECT success FROM fishing_attempts
     WHERE player_name = $1
     ORDER BY created_at DESC LIMIT 1`,
    [playerName]
  );
  const attempt = res.rows[0];
  if (!attempt) return [];
 
  return [attempt.success
    ? "You feel a tug on the line — got one!"
    : "The line goes still. Nothing this time."];
}

export async function narrateGolem(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'golem')) return [];
 
  const res = await client.query(
    `SELECT success FROM golem_attacks
     WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
    [playerName]
  );
  const fight = res.rows[0];
  if (!fight) return [];
 
  return [fight.success
    ? "Your steel sword bites true. The golem crumbles to rubble, leaving only its core behind."
    : "You swing your sword, yet it does no damage. Stone fists crash down before you can react. You stagger back, badly hurt."];
}

export async function narrateRiddle(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'riddles')) return [];
 
  const res = await client.query(
    `SELECT correct FROM riddle_attempts
     WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
    [playerName]
  );
  const attempt = res.rows[0];
  if (!attempt) return [];
 
  return [attempt.correct
    ? "The dragon's eye closes slowly. \"Correct.\" It nudges a blackened cask toward you with one claw. \"Drink it, or trade it. I no longer care which.\""
    : "The dragon exhales. The heat alone knocks you back a step."];
}

export async function narrateDig(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'digs')) return [];

  if (before.counts.digs > 0) {
    return ["You work at the rock a while longer. The passage you opened is still there, and still empty."];
  }
 
  return ["Your pick punches through into open air. Behind the rock face, a passage — cut, not natural — leads down into the dark."];
}

export async function narrateTowerDoor(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'door')) return [];
 
  const res = await client.query(
    `SELECT correct FROM tower_door_attempts
     WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
    [playerName]
  );
  const attempt = res.rows[0];
  if (!attempt) return [];
 
  return [attempt.correct
    ? "The word settles into the stone like water into sand. Something vast shifts behind the wall, and the door swings inward. Beyond is the tower_interior, if you dare step through."
    : "The stone drinks the word and gives nothing back. The door does not move."];
}
 
export async function narrateTowerSocket(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'socket')) return [];
 
  return [
    "The core settles into the socket with a sound like a held breath released. Light runs up the inside of the tower, and above you the storm begins to unwind — slowly, then all at once, the sky goes quiet.",
    "It is over. Whatever was building here will not break.",
    "There is nothing holding you here now. You could go home — insert into retirements with your name, if you're ready to be done.",

  ];
}
 
export async function narrateTitles(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'titles')) return [];
 
  const gained = timesHappened(before, after, 'titles');
 
  const res = await client.query(
    `SELECT t.name FROM player_titles pt
     JOIN titles t ON t.slug = pt.title_slug
     WHERE pt.player_name = $1
     ORDER BY pt.earned_at DESC LIMIT $2`,
    [playerName, gained]
  );
 
  return res.rows.map(r => `You have earned a title: ${r.name}.`);
}

 export async function narrateRetirement(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  if (!happened(before, after, 'retirements')) return [];

  const res = await client.query(
    "SELECT final_score, title_count FROM retirements WHERE player_name = $1",
    [playerName]
  );
  const r = res.rows[0];
  if (!r) return [];

  return [
    "You set down your pack by the door. The barley needs cutting, and the sky is the right colour again.",
    `You retire with ${r.title_count} title${r.title_count === 1 ? '' : 's'} and a score of ${r.final_score}.`,
  ];
}

type Narrator = (
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
) => Promise<string[]>;
 
const NARRATORS: Narrator[] = [
  narrateLocation,
  narrateHealth,
  narrateDig,
  narrateRiddle,
  narrateGolem,
  narrateFishing,
  narrateTowerDoor,
  narrateGold,
  narrateInventory,
  narrateGift,
  narrateTowerSocket,
  narrateTitles,
  narrateRetirement
];
 
export async function buildNarration(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
  const lines: string[] = [];
 
  for (const narrate of NARRATORS) {
    lines.push(...await narrate(client, playerName, before, after));
  }
 
  return lines;
}
 


