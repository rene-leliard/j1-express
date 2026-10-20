import type { Request, Response, NextFunction } from 'express';

// Journalise une ligne par requête, une fois la réponse envoyée : "GET /api/games 200 12.3 ms".
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    if (req.originalUrl !== '/api/health') {
        res.on('finish', () => {
            const ms = Number(process.hrtime.bigint() - start) / 1e6;
            console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)} ms`);
        });
    }
    next();
}
