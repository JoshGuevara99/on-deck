import { Router } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const usersRouter = Router();

const SyncBodySchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

/** POST /users/sync — upsert the Clerk user into our Postgres users table */
usersRouter.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { email, name } = SyncBodySchema.parse(req.body);

    const user = await prisma.user.upsert({
      where: { id: userId as string },
      update: { email, name: name ?? null },
      create: { id: userId as string, email, name: name ?? null },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** GET /users/me/events — returns only events submitted by the authenticated user */
usersRouter.get('/me/events', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const events = await prisma.event.findMany({
      where: { submittedBy: userId as string },
      include: { venue: true },
      orderBy: { startsAt: 'asc' },
    });

    res.json(events);
  } catch (err) {
    next(err);
  }
});
