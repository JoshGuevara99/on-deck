import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const attendeesRouter = Router({ mergeParams: true });

/** POST /events/:id/attendees — RSVP "I'm going" */
attendeesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { id: eventId } = req.params as { id: string };
    const { userId } = getAuth(req);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendee = await prisma.eventAttendee.create({
      data: { eventId, userId: userId as string },
    });

    res.status(201).json(attendee);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Already RSVPed' });
    }
    next(err);
  }
});

/** DELETE /events/:id/attendees — cancel RSVP */
attendeesRouter.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { id: eventId } = req.params as { id: string };
    const { userId } = getAuth(req);

    await prisma.eventAttendee.deleteMany({
      where: { eventId, userId: userId as string },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
