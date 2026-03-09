import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { healthRouter } from './routes/health';
import { eventsRouter } from './routes/events';
import { usersRouter } from './routes/users';
import { signupsRouter } from './routes/signups';
import { attendeesRouter } from './routes/attendees';
import { notFound, errorHandler } from './middleware/errors';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/events', eventsRouter);
app.use('/events/:id/signups', signupsRouter);
app.use('/events/:id/attendees', attendeesRouter);
app.use('/users', usersRouter);

// ─── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
