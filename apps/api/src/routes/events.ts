import { Router } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import * as eventsService from '../services/events.service';
import { ApiError } from '../middleware/errors';
import { requireAuth } from '../middleware/auth';

export const eventsRouter = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const EventTypeEnum = z.enum([
  'OPEN_MIC',
  'JAM_SESSION',
  'COMEDY_NIGHT',
  'POETRY_SLAM',
  'OPEN_STAGE',
  'WORKSHOP',
  'OPEN_STUDIO',
]);

const SignUpMethodEnum = z.enum(['DOOR', 'ONLINE', 'APP']);

const VenueInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  neighborhood: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO-8601 datetime' }),
  endsAt: z.string().datetime().optional(),
  type: EventTypeEnum,
  genres: z.array(z.string()).optional().default([]),
  coverCharge: z.string().optional(),
  slotDuration: z.string().optional(),
  backline: z.array(z.string()).optional().default([]),
  signUpMethod: SignUpMethodEnum.optional().default('DOOR'),
  isRecurring: z.boolean().optional().default(false),
  recurringDescription: z.string().optional(),
  venue: VenueInputSchema,
});

const UpdateEventSchema = CreateEventSchema.omit({ venue: true }).partial();

const ListQuerySchema = z.object({
  type: z.string().optional(),
  city: z.string().optional(),
  submittedBy: z.string().optional(),
  tonight: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  free: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0)),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /events */
eventsRouter.get('/', async (req, res, next) => {
  try {
    const filters = ListQuerySchema.parse(req.query);
    const events = await eventsService.listEvents(filters);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

/** GET /events/:id */
eventsRouter.get('/:id', async (req, res, next) => {
  try {
    const event = await eventsService.getEvent(req.params.id);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

/** POST /events */
eventsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = CreateEventSchema.parse(req.body);
    const { userId } = getAuth(req);
    const event = await eventsService.createEvent(input, userId ?? undefined);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/** PATCH /events/:id */
eventsRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = UpdateEventSchema.parse(req.body);
    const event = await eventsService.updateEvent(req.params.id, input);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

/** DELETE /events/:id */
eventsRouter.delete('/:id', async (req, res, next) => {
  try {
    await eventsService.deleteEvent(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
