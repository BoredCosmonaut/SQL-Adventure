export interface queryResponse {
    rows: Record<string,unknown>[];
    narration: string[];
}

export interface authResponse{
    playerName:string;
    message?:string;
    retired?:boolean;
    score?:number;
    retiredAt?:string;
    titles?:Title[];
}

export interface Title{
    name:string;
    description:string;
    points:number;
}

export interface errorResponse{
    error:string;
}

interface apiResult<T> {
    ok:boolean;
    status:number;
    data: T & Partial<errorResponse>;
}

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

async function post<T>(path:string, body?:unknown):Promise<apiResult<T>> {
    try {
        const res = await fetch(`${BASE}/api/user${path}`, {
            method:'POST',
            headers:{'Content-Type': 'application/json'},
            credentials:"include",
            body:JSON.stringify(body?? {}),
        });

        const data = await res.json().catch(() => ({}));

        return {ok:res.ok, status:res.status, data};
    } catch {
        return {
            ok: false,
            status: 0,
            data: { error: 'Could not reach the server' } as T & Partial<errorResponse>,
        };
    }
}

export const register = (name:string,password:string) => {
    return post<authResponse>('/register',{name,password});
}

export const login = (name:string,password:string) =>{
    return post<authResponse>('/login',{name,password});
}

export const logout = () => { 
    return post<{message:string}> ('/logout')
};

export const runQuery = (sql:string) => {
    return post<queryResponse>('/query',{sql});
}

export const me = () => {
    return post<authResponse>('/me');
}