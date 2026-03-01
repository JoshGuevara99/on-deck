import { PrismaClient, EventType, SignUpMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Venues ──────────────────────────────────────────────────────────────────
  const venues = await Promise.all([
    prisma.venue.upsert({
      where: { id: 'venue-1' },
      update: {},
      create: {
        id: 'venue-1',
        name: 'The Bitter End',
        address: '147 Bleecker St',
        neighborhood: 'Greenwich Village',
        city: 'New York',
        state: 'NY',
        lat: 40.7282,
        lng: -74.0,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-2' },
      update: {},
      create: {
        id: 'venue-2',
        name: 'Rockwood Music Hall',
        address: '196 Allen St',
        neighborhood: 'Lower East Side',
        city: 'New York',
        state: 'NY',
        lat: 40.7218,
        lng: -73.9876,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-3' },
      update: {},
      create: {
        id: 'venue-3',
        name: 'Bar Chord',
        address: '1008 Cortelyou Rd',
        neighborhood: 'Ditmas Park',
        city: 'Brooklyn',
        state: 'NY',
        lat: 40.6418,
        lng: -73.9638,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-4' },
      update: {},
      create: {
        id: 'venue-4',
        name: 'The Sidewalk Cafe',
        address: '94 Ave A',
        neighborhood: 'East Village',
        city: 'New York',
        state: 'NY',
        lat: 40.7265,
        lng: -73.9816,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-5' },
      update: {},
      create: {
        id: 'venue-5',
        name: 'Branded Saloon',
        address: '603 Vanderbilt Ave',
        neighborhood: 'Prospect Heights',
        city: 'Brooklyn',
        state: 'NY',
        lat: 40.6763,
        lng: -73.9683,
      },
    }),
  ]);

  console.log(`Seeded ${venues.length} venues`);

  // ── Events ───────────────────────────────────────────────────────────────────
  const now = new Date();
  const d = (daysFromNow: number, hour: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + daysFromNow);
    dt.setHours(hour, 0, 0, 0);
    return dt;
  };

  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: 'event-1' },
      update: {},
      create: {
        id: 'event-1',
        venueId: 'venue-1',
        title: 'Monday Open Mic Night',
        description: 'All genres welcome. Sign up at the door from 7 PM. Hosted by DJ Rosa.',
        startsAt: d(0, 19),
        endsAt: d(0, 23),
        type: EventType.OPEN_MIC,
        genres: ['Folk', 'Singer-Songwriter', 'Indie'],
        coverCharge: 'Free',
        slotDuration: '5 min',
        backline: ['PA', 'Acoustic Guitar', 'Keyboard'],
        signUpMethod: SignUpMethod.DOOR,
        isRecurring: true,
        recurringDescription: 'Every Monday',
        isApproved: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-2' },
      update: {},
      create: {
        id: 'event-2',
        venueId: 'venue-2',
        title: 'Tuesday Jazz Jam',
        description: 'Open jam for all jazz musicians. House rhythm section provided.',
        startsAt: d(1, 21),
        endsAt: d(2, 1),
        type: EventType.JAM_SESSION,
        genres: ['Jazz', 'Bebop', 'Fusion'],
        coverCharge: '$5',
        slotDuration: 'Open',
        backline: ['Drums', 'Bass Amp', 'PA', 'Piano'],
        signUpMethod: SignUpMethod.DOOR,
        isRecurring: true,
        recurringDescription: 'Every Tuesday',
        isApproved: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-3' },
      update: {},
      create: {
        id: 'event-3',
        venueId: 'venue-3',
        title: 'Brooklyn Open Mic',
        description: 'Music, comedy, spoken word — all welcome. No experience required.',
        startsAt: d(2, 20),
        endsAt: d(2, 23),
        type: EventType.OPEN_MIC,
        genres: ['Any'],
        coverCharge: 'Free',
        slotDuration: '7 min',
        backline: ['PA', 'Mic Stand'],
        signUpMethod: SignUpMethod.APP,
        isRecurring: true,
        recurringDescription: 'Every Wednesday',
        isApproved: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-4' },
      update: {},
      create: {
        id: 'event-4',
        venueId: 'venue-4',
        title: 'Anti-Folk Open Stage',
        description: 'The original anti-folk stage. Raw, weird, and wonderful.',
        startsAt: d(3, 19),
        endsAt: d(3, 22),
        type: EventType.OPEN_STAGE,
        genres: ['Anti-Folk', 'Experimental', 'Punk'],
        coverCharge: 'Free',
        slotDuration: '3 songs',
        backline: ['PA', 'Guitar Amp', 'Drum Kit'],
        signUpMethod: SignUpMethod.DOOR,
        isRecurring: false,
        isApproved: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-5' },
      update: {},
      create: {
        id: 'event-5',
        venueId: 'venue-5',
        title: 'Comedy Open Mic',
        description: '5 minutes each. Bring your best material or your worst — we take both.',
        startsAt: d(4, 20),
        endsAt: d(4, 23),
        type: EventType.COMEDY_NIGHT,
        genres: [],
        coverCharge: 'Free',
        slotDuration: '5 min',
        backline: ['PA', 'Mic Stand'],
        signUpMethod: SignUpMethod.ONLINE,
        isRecurring: true,
        recurringDescription: 'Every Friday',
        isApproved: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-6' },
      update: {},
      create: {
        id: 'event-6',
        venueId: 'venue-1',
        title: 'Saturday Blues Jam',
        description: 'All instruments welcome. House band kicks things off at 9.',
        startsAt: d(5, 21),
        endsAt: d(6, 1),
        type: EventType.JAM_SESSION,
        genres: ['Blues', 'R&B', 'Soul'],
        coverCharge: '$10 at door',
        slotDuration: 'Open',
        backline: ['Full Backline', 'PA'],
        signUpMethod: SignUpMethod.DOOR,
        isRecurring: true,
        recurringDescription: 'Every Saturday',
        isApproved: true,
      },
    }),
  ]);

  console.log(`Seeded ${events.length} events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
