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

const UpdateUserSchema = z.object({
  displayName: z.string().max(60).optional(),
  bio: z.string().max(280).optional(),
  performerType: z.enum(['MUSICIAN', 'COMEDIAN', 'POET', 'STORYTELLER', 'OTHER']).nullable().optional(),
  instruments: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
});

/** POST /users/sync — upsert the Clerk user into our Postgres users table */
usersRouter.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { email, name } = SyncBodySchema.parse(req.body);

    try {
      const user = await prisma.user.upsert({
        where: { id: userId as string },
        update: { email, name: name ?? null },
        create: { id: userId as string, email, name: name ?? null },
      });
      return res.json(user);
    } catch (upsertErr: any) {
      // P2002: email already exists for a different Clerk user ID (e.g. dev DB reuse).
      // Claim the existing record for this Clerk user rather than blocking sync.
      if (upsertErr?.code === 'P2002') {
        const user = await prisma.user.update({
          where: { email },
          data: { id: userId as string, name: name ?? null },
        });
        return res.json(user);
      }
      throw upsertErr;
    }
  } catch (err) {
    next(err);
  }
});

/** PATCH /users/me — update performer identity fields */
usersRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const input = UpdateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId as string },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.performerType !== undefined && { performerType: input.performerType }),
        ...(input.instruments !== undefined && { instruments: input.instruments }),
        ...(input.genres !== undefined && { genres: input.genres }),
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** GET /users/me — fetch current user's full profile */
usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** GET /users/me/events — events submitted by the authenticated user */
usersRouter.get('/me/events', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const events = await prisma.event.findMany({
      where: { submittedBy: userId as string },
      include: {
        venue: true,
        _count: { select: { signups: true, attendees: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    res.json(events.map(({ _count, ...e }) => ({
      ...e,
      signupCount: _count.signups,
      attendeeCount: _count.attendees,
    })));
  } catch (err) {
    next(err);
  }
});

/** GET /users/me/signups — events the user has signed up to perform at */
usersRouter.get('/me/signups', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const signups = await prisma.eventSignup.findMany({
      where: { userId: userId as string, status: { not: 'REMOVED' } },
      include: {
        event: {
          include: {
            venue: true,
            _count: { select: { signups: true, attendees: true } },
          },
        },
      },
      orderBy: { event: { startsAt: 'asc' } },
    });

    res.json(signups.map((s) => {
      const { _count, ...event } = s.event;
      return {
        ...s,
        event: { ...event, signupCount: _count.signups, attendeeCount: _count.attendees },
      };
    }));
  } catch (err) {
    next(err);
  }
});

/** GET /users/me/attending — events the user has RSVPed to attend */
usersRouter.get('/me/attending', requireAuth, async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const attendees = await prisma.eventAttendee.findMany({
      where: { userId: userId as string },
      include: {
        event: {
          include: {
            venue: true,
            _count: { select: { signups: true, attendees: true } },
          },
        },
      },
      orderBy: { event: { startsAt: 'asc' } },
    });

    res.json(attendees.map((a) => {
      const { _count, ...event } = a.event;
      return {
        ...a,
        event: { ...event, signupCount: _count.signups, attendeeCount: _count.attendees },
      };
    }));
  } catch (err) {
    next(err);
  }
});
