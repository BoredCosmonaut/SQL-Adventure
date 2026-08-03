const FORBIDDEN_KEYWORDS = [
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
];

export  function containsForbiddenSql(sql:string): string | null {
    const upper = sql.toUpperCase();
    for(const keyword of FORBIDDEN_KEYWORDS) {
        const pattern = new RegExp(`\\b${keyword}\\b`);
        if(pattern.test(upper)) {
            return keyword
        }
    }
    return null
}