# SELECT adventure FROM khargazim

![SELECT adventure FROM khargazim](./wordmark.svg)

A text adventure game where you play by writing real SQL. You query a live Postgres database to move around, talk to people, get
items, everything. I built this because I wanted to practice my sql a bit will probably update it with more interactions later add more easter eggs more content etc.

**Live here: [sql-adventure.com](https://sql-adventure.com)**

## How it actually works

There's no parser reading your queries and deciding what they "mean." Instead:

1. You type SQL into the input bar (like `UPDATE players SET location_slug = 'farm' WHERE name = 'you'`)
2. Before your query runs, the server takes a snapshot of your character (location, hp, gold, inventory, whatever)
3. Your query runs against the database — you're locked to your own row/session via row-level security, so you can't mess with anyone else's stuff even if you tried
4. After it runs, the server snapshots you again and diffs the two — that diff is what generates the narration text ("You arrive at Your Father's House...")
5. You get both the narration and the raw rows your query returned

If a query gets rejected (blocked move, bad SQL, whatever), it shows up as part of the story
instead of an error . The game never reads what you typed — it only ever
looks at what changed before vs after.

## Stack

- **Frontend:** Vue 3 + TypeScript, Vue Router
- **Backend:** Node/Express + TypeScript
- **DB:** Postgres, RLS on everything player-facing so people can only touch their own data
- **Hosted on:** a DigitalOcean droplet, Nginx in front, pm2 keeping the backend alive, Let's Encrypt for HTTPS

## Project layout

```
├── backend/
│   ├── src/
│   │   ├── controllers/   # auth + query execution
│   │   ├── models/        # db access, snapshotting, diffing, logging
│   │   ├── routes/
│   │   ├── services/      # turns state diffs into narration
│   │   └── utils/         # blocks destructive SQL
└── frontend/
    ├── src/
    │   ├── components/    # log, input bar, results table
    │   ├── views/          # login/game/retired pages
    │   ├── store/          # session state
    │   └── router/
    └── public/             # favicon, robots.txt etc
```
(The schema file isn't here since it's still being worked on)
## Some design stuff

- the game never parses what you type — narration always comes from diffing state before/after,
  never from reading your query. means players can write arbitrary SQL, not some
  limited subset
- errors are part of the game, not a failure state. a blocked move reads like the world telling
  you no — actual server crashes look different on purpose so you can tell
  the difference
- RLS does all the real security work. doesn't matter what SQL someone writes, they physically
  cannot see or touch another player's rows

## License

personal project, not licensed for reuse right now