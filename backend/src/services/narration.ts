import { Pool, PoolClient } from "pg";
import { PlayerSnapshot } from "../models/playerModel";
import { before } from "node:test";

const GIFT_REACTIONS: Record<string,Record<string,string>> = {
    tavern_cat:{
        fish:"Scruffy pounces on the fish immediately, purring loudly.",
    },
    dwarf_elder:{
        dragon_ale:"Bruni cracks the cask, sniffs, and goes very quiet. Then he drinks. \"...Where in the deep did you get this?\" He waves at a crate without looking away from the cup. \"Take them. Take two, I don't care.\"",
    }
};

function getGiftReaction(npcSlug:string, itemSlug:string): string {
    return GIFT_REACTIONS[npcSlug]?.[itemSlug] ?? "Your gift is warmly accepted";
};


const cave_in_messages = [
    "The ceiling groans and showers you with rock and dust. You stumble back, hurt.",
    "A support beam gives way behind you. Stone crashes down — you barely get clear in time.",
    "The tunnel shudders. For a moment, you catch a glimpse of something strange embedded in the rock — a cluster of oddly cubic shapes, almost too perfectly square to be natural. Then the dust settles and it's gone.",
];

function getCaveInMessage(): string {
    return cave_in_messages[Math.floor(Math.random() * cave_in_messages.length)];
};

export async function narrateLocation(
    client:PoolClient,
    playerName:string,
    before:PlayerSnapshot,
    after:PlayerSnapshot
): Promise<string[]> {
    if(before.location_slug === after.location_slug) return [];

    const lines: string[] = [];
    const isFirstVisit = after.visitCount > before.visitCount;
    if(after.location_slug === 'tower' && before.location_slug === 'mountains' && isFirstVisit) {
        lines.push("You wedge the charges into the boulder's base and take cover. The blast shakes the whole pass — when the dust clears, the way is open.");
    }

    if (after.location_slug === 'lemnian_catacombs' && isFirstVisit) {
    lines.push("Carved into the far wall, in letters that hurt to look at, a single word: VEKTHANEIROS. You do not know how you know it is a name, but you do.");
    }

    if (after.location_slug === 'lemnian_catacombs' && isFirstVisit) {
    lines.push("Carved into the far wall, in letters that hurt to look at, a single word: VEKTHANEIROS. You do not know how you know it is a name, but you do.");
    }

    const res = await client.query(
        "SELECT name,description FROM locations WHERE slug = $1",
        [after.location_slug]
    );

    const loc = res.rows[0];
    if(loc) lines.push(`You arrive at ${loc.name}. ${loc.description}`);
    if(after.location_slug === 'hollow_vein') {
        const hasTome = after.inventory.some(i => i.item_slug === 'old_tome');
        if(hasTome) {
            lines.push("You recall the tome's words about sealed halls beneath this very mine. Perhaps there's something worth digging for here.");
        }
    }
    return lines;
}

export async function narrateHealth(
    client:PoolClient,
    playerName:string,
    before:PlayerSnapshot,
    after:PlayerSnapshot
): Promise<string[]> {
    if(before.hp === after.hp) return[];
    const delta = after.hp - before.hp;

    if(after.hp <= 0) {
        const res = await client.query(
            `SELECT j.death_message FROM job_events je
            JOIN jobs j ON j.slug = je.job_slug
            WHERE je.player_name = $1 ORDER BY je.created_at DESC LIMIT 1`,
            [playerName] 
        );
        return [res.rows[0]?.death_message ?? 'You collapse, your journey at an end.'];
    }

    if(after.hazardHitCount > before.hazardHitCount) {
        return[getCaveInMessage()];
    }

    return [ delta > 0
        ? `You feel better. (+${delta} HP)`
        : `You take damage. (-${delta} HP)`
    ];
};

export async function narrateGold(
    client:PoolClient,
    playerName:string,
    before:PlayerSnapshot,
    after:PlayerSnapshot
): Promise<string[]> {
    if(before.gold === after.gold) return[]

    const delta = after.gold - before.gold;
    return [delta > 0 ? `You gain ${delta} gold.` : `You lose ${-delta} gold.`];
};

export async function narrateInventory(
    client: PoolClient,
    playerName: string,
    before: PlayerSnapshot,
    after: PlayerSnapshot
): Promise <string[]>{
    const lines: string[] = [];

    const beforeMap = new Map(before.inventory.map(i => [i.item_slug, i.quantity]));
    const afterMap = new Map(after.inventory.map(i => [i.item_slug, i.quantity]));
    const allSlugs = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    const didSell = after.salesCount > before.salesCount;
    const didGift = after.giftCount > before.giftCount;
    const didUse = after.useCount > before.useCount;


    for(const slug of allSlugs) {
        const beforeQty = beforeMap.get(slug) ?? 0;
        const afterQty = afterMap.get(slug) ?? 0;

        if(afterQty === beforeQty) continue;

        const res = await client.query("SELECT name FROM items WHERE slug = $1", [slug]);
        const itemName = res.rows[0]?.name ?? slug;

        if(afterQty > beforeQty) {
            lines.push(`You pick up ${itemName}.`);
        } else if(didSell) {
            lines.push(`You sell ${itemName}.`);
        } else if(didGift) {
            lines.push(`You give away ${itemName}.`);
        } else if(didUse) {
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
    if(after.giftCount <= before.giftCount) return [];

    const res = await client.query(
        `SELECT npc_slug, item_slug FROM npc_gifts
        WHERE player_name = $1
        ORDER BY given_at DESC LIMIT 1`,
        [playerName]
    );
    const lastGift = res.rows[0];
    if(!lastGift) return [];

    return [getGiftReaction(lastGift.npc_slug,lastGift.item_slug)];
}

export async function narrateTower(
  client: PoolClient,
  playerName: string,
  before: PlayerSnapshot,
  after: PlayerSnapshot
): Promise<string[]> {
    if(after.doorAttemptCount <= before.doorAttemptCount) return [];

    const res = await client.query(
        `SELECT correct FROM tower_door_attempts
        WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
        [playerName]
    );

    const attempt = res.rows[0];
    if(!attempt) return[];

    return[attempt.correct
        ? "The word settles into the stone like water into sand. Something vast shifts behind the wall, and the door swings inward. The way into Vekthaneiros is open."
        : "The stone drinks the word and gives nothing back. The door does not move."
    ]
}

export async function narrateFishing(
    client: PoolClient,
    playerName: string,
    before: PlayerSnapshot,
    after: PlayerSnapshot
): Promise<string[]> {
    if(after.fishAttemptCount <= before.fishAttemptCount) return[];
    const res = await client.query(
        `SELECT success FROM fishing_attempts
        WHERE player_name = $1
        ORDER BY created_at DESC LIMIT 1`,
        [playerName]
    );

    const attempt = res.rows[0];
    if(!attempt) return[];

    return[attempt.success
        ? "You feel a tug on the line — got one!"
        : "The line goes still. Nothing this time."
    ]
}

export async function narrateGolem(
    client: PoolClient,
    playerName: string,
    before: PlayerSnapshot,
    after: PlayerSnapshot
):Promise<string[]> {
    if(after.golemCount <= before.golemCount) return[];

    const res = await client.query(
        `SELECT success FROM golem_attacks
        WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
        [playerName]
    );
    const fight = res.rows[0];
    if(!fight) return[];

    return [fight.success
        ? "Your steel sword bites true. The golem crumbles to rubble, leaving only its core behind."
        : "You swing your sword, yet it does no damage. Stone fists crash down before you can react. You stagger back, badly hurt."
    ];
}

export async function narrateRiddle(
    client: PoolClient,
    playerName: string,
    before: PlayerSnapshot,
    after: PlayerSnapshot

): Promise<string[]> {
    if(after.riddleCount <= before.riddleCount) return[];
    const res = await client.query(
        `SELECT correct FROM riddle_attempts
        WHERE player_name = $1 ORDER BY created_at DESC LIMIT 1`,
        [playerName]
    );
    const attempt = res.rows[0];
    if(!attempt) return[];

    return[attempt.correct
        ? "The dragon's eye closes slowly. \"Correct.\" It nudges a blackened cask toward you with one claw. \"Drink it, or trade it. I no longer care which.\""
        : "The dragon exhales. The heat alone knocks you back a step."
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
  narrateRiddle,
  narrateGolem,
  narrateFishing,
  narrateGold,
  narrateInventory,
  narrateGift,
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

