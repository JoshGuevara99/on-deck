import { Router } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const signupsRouter = Router({ mergeParams: true });

const PerformerTypeEnum = z.enum(['MUSICIAN', 'COMEDIAN', 'POET', 'STORYTELLER', 'OTHER']);

const CreateSignupSchema = z.object({
  guestName: z.string().min(1).max(100).optional(),
  guestEmail: z.string().email().max(200).optional(),
  performerType: PerformerTypeEnum.optional(),
  instruments: z.array(z.string()).optional().default([]),
  genres: z.array(z.string()).optional().default([]),
  note: z.string().max(280).optional(),
  instagramHandle: z.string().max(60).optional(),
  tiktokHandle: z.string().max(60).optional(),
});

const UpdateSignupSchema = z.object({
  slotOrder: z.number().int().min(0).optional(),
  status: z.enum(['SIGNED_UP', 'PERFORMED', 'NO_SHOW', 'REMOVED']).optional(),
});

/** Fields included in every public roster response */
const PUBLIC_SIGNUP_SELECT = {
  id: true,
  guestName: true,
  slotOrder: true,
  status: true,
  performerType: true,
  instruments: true,
  genres: true,
  instagramHandle: true,
  tiktokHandle: true,
  createdAt: true,
  user: { select: { id: true, displayName: true, name: true, avatarUrl: true } },
} as const;

/** GET /events/:id/signups
 * Everyone: returns public roster (name, type, socials — no note/userId).
 * Host: returns full roster including note and userId.
 */
signupsRouter.get('/', async (req, res, next) => {
  try {
    const { id: eventId } = req.params as { id: string };
    const { userId } = getAuth(req);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const isHost = !!userId && event.hostId === userId;

    if (isHost) {
      const signups = await prisma.eventSignup.findMany({
        where: { eventId },
        include: { user: { select: { id: true, displayName: true, name: true, avatarUrl: true } } },
        orderBy: [{ slotOrder: 'asc' }, { createdAt: 'asc' }],
      });
      return res.json(signups);
    }

    // Public: active slots only, safe fields
    const signups = await prisma.eventSignup.findMany({
      where: { eventId, status: { in: ['SIGNED_UP', 'PERFORMED'] } },
      select: PUBLIC_SIGNUP_SELECT,
      orderBy: [{ slotOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json(signups);
  } catch (err) {
    next(err);
  }
});

/** POST /events/:id/signups — sign up to perform (auth optional — guests welcome) */
signupsRouter.post('/', async (req, res, next) => {
  try {
    const { id: eventId } = req.params as { id: string };
    const { userId } = getAuth(req);
    const isGuest = !userId;
    const input = CreateSignupSchema.parse(req.body);

    if (isGuest && !input.guestName?.trim()) {
      return res.status(400).json({ error: 'Name is required to sign up' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.signupsEnabled) return res.status(400).json({ error: 'Sign-ups are not enabled for this event' });

    // Check max slots
    if (event.maxSlots !== null) {
      const activeCount = await prisma.eventSignup.count({
        where: { eventId, status: { not: 'REMOVED' } },
      });
      if (activeCount >= event.maxSlots) {
        return res.status(409).json({ error: 'This event is full' });
      }
    }

    const signup = await prisma.eventSignup.create({
      data: {
        eventId,
        userId: isGuest ? null : (userId as string),
        guestName: isGuest ? input.guestName!.trim() : null,
        guestEmail: isGuest ? (input.guestEmail?.trim() || null) : null,
        source: isGuest ? 'web' : 'app',
        performerType: input.performerType ?? null,
        instruments: input.instruments,
        genres: input.genres,
        note: input.note ?? null,
        instagramHandle: input.instagramHandle?.trim() || null,
        tiktokHandle: input.tiktokHandle?.trim() || null,
      },
      include: { user: { select: { id: true, displayName: true, name: true, avatarUrl: true } } },
    });

    // Return slot position
    const position = await prisma.eventSignup.count({
      where: { eventId, status: { not: 'REMOVED' }, createdAt: { lte: signup.createdAt } },
    });

    res.status(201).json({ ...signup, slotPosition: position });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'You are already signed up for this event' });
    }
    next(err);
  }
});

/** DELETE /events/:id/signups — cancel your own signup */
signupsRouter.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { id: eventId } = req.params as { id: string };
    const { userId } = getAuth(req);

    await prisma.eventSignup.updateMany({
      where: { eventId, userId: userId as string },
      data: { status: 'REMOVED' },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** PATCH /events/:id/signups/:signupId — host only: reorder or update status */
signupsRouter.patch('/:signupId', requireAuth, async (req, res, next) => {
  try {
    const { id: eventId, signupId } = req.params as { id: string; signupId: string };
    const { userId } = getAuth(req);
    const input = UpdateSignupSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.hostId !== userId) return res.status(403).json({ error: 'Only the host can update signups' });

    const signup = await prisma.eventSignup.update({
      where: { id: signupId },
      data: {
        ...(input.slotOrder !== undefined && { slotOrder: input.slotOrder }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { user: { select: { id: true, displayName: true, name: true, avatarUrl: true } } },
    });

    // If marking as PERFORMED and signup belongs to a registered user, increment their count
    if (input.status === 'PERFORMED' && signup.userId) {
      await prisma.user.update({
        where: { id: signup.userId },
        data: { performanceCount: { increment: 1 } },
      });
    }

    res.json(signup);
  } catch (err) {
    next(err);
  }
});
