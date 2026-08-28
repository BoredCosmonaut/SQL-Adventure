import {Pool} from 'pg'
import 'dotenv/config'

// This pool always connects as `game_player` -- the low-privilege
export const gamePool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE,
    user: process.env.GAME_DB_USER,
    password: process.env.GAME_DB_PASSWORD,
    max:10,
    idleTimeoutMillis:30000
});