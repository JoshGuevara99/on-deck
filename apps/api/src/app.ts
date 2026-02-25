import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { eventsRouter } from './routes/events';
import { venuesRouter } from './routes/venues';
import { notFound, errorHandler } from './middleware/errors';

export const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/events', eventsRouter);
app.use('/venues', venuesRouter);

// ─── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
