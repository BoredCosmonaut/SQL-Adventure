import express  from "express";
import session from 'express-session';
import cors from 'cors'
import 'dotenv/config'
import { playerRouter } from "./routes/playerRoutes";

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
        credentials:true,
    })
);


app.use(express.json());

app.use(
    session({
        secret:process.env.SESSION_SECRET ?? "dev-secret-change-me",
        resave:false,
        saveUninitialized:false,
        cookie:{httpOnly:true,sameSite:'lax'}
    })
);


app.use('/api/user',playerRouter);

app.get('/api/health', (req,res) => {
    res.json({ok:true});
});

const port = process.env.PORT ?? 4000;
app.listen(port,() => {
    console.log(`SQL Adventure API running on http://localhost:${port}`);
});