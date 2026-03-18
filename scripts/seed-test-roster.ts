/**
 * Seed script: creates a test event with a 10-person roster of dummy users.
 *
 * Safe to re-run — skips creation if the test event already exists.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-test-roster.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Dummy performers ─────────────────────────────────────────────────────────

const DUMMY_USERS = [
  {
    id: 'dummy_user_01',
    email: 'marcus.bell@ondeck.test',
    name: 'Marcus Bell',
    displayName: 'Marcus Bell',
    bio: 'Jazz guitarist based in Brooklyn. Playing since I was 7.',
    performerType: 'MUSICIAN' as const,
    instruments: ['guitar', 'bass'],
    genres: ['jazz', 'blues'],
    performanceCount: 12,
    instagramHandle: 'marcusbell_music',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_01',
  },
  {
    id: 'dummy_user_02',
    email: 'sarah.chen@ondeck.test',
    name: 'Sarah Chen',
    displayName: 'Sarah Chen',
    bio: 'Stand-up comedian. I make people laugh so I don\'t have to cry.',
    performerType: 'COMEDIAN' as const,
    instruments: [],
    genres: ['observational', 'self-deprecating'],
    performanceCount: 8,
    instagramHandle: null,
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_02',
  },
  {
    id: 'dummy_user_03',
    email: 'dj.okafor@ondeck.test',
    name: 'DJ Okafor',
    displayName: 'D.J. Okafor',
    bio: 'Spoken word poet. Words are the only instrument I need.',
    performerType: 'POET' as const,
    instruments: [],
    genres: ['spoken word', 'political'],
    performanceCount: 5,
    instagramHandle: 'djokafor_words',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_03',
  },
  {
    id: 'dummy_user_04',
    email: 'lena.russo@ondeck.test',
    name: 'Lena Russo',
    displayName: 'Lena Russo',
    bio: 'Singer-songwriter from Queens. Folk and soul.',
    performerType: 'MUSICIAN' as const,
    instruments: ['vocals', 'acoustic guitar'],
    genres: ['folk', 'soul'],
    performanceCount: 21,
    instagramHandle: 'lenarussomusic',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_04',
  },
  {
    id: 'dummy_user_05',
    email: 'ray.kim@ondeck.test',
    name: 'Ray Kim',
    displayName: 'Ray Kim',
    bio: 'Drummer. I keep the time so everyone else doesn\'t have to.',
    performerType: 'MUSICIAN' as const,
    instruments: ['drums', 'percussion'],
    genres: ['funk', 'hip-hop', 'jazz'],
    performanceCount: 34,
    instagramHandle: null,
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_05',
  },
  {
    id: 'dummy_user_06',
    email: 'nia.washington@ondeck.test',
    name: 'Nia Washington',
    displayName: 'Nia Washington',
    bio: 'Comedian and writer. NYC transplant via Atlanta.',
    performerType: 'COMEDIAN' as const,
    instruments: [],
    genres: ['storytelling', 'dark humor'],
    performanceCount: 3,
    instagramHandle: 'niawashington_',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_06',
  },
  {
    id: 'dummy_user_07',
    email: 'tom.hayes@ondeck.test',
    name: 'Tom Hayes',
    displayName: 'Tom Hayes',
    bio: 'Keys and vibes. I play jazz standards and original tunes.',
    performerType: 'MUSICIAN' as const,
    instruments: ['piano', 'keyboards'],
    genres: ['jazz', 'bossa nova'],
    performanceCount: 17,
    instagramHandle: 'tomhayeskeys',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_07',
  },
  {
    id: 'dummy_user_08',
    email: 'priya.nair@ondeck.test',
    name: 'Priya Nair',
    displayName: 'Priya Nair',
    bio: 'Storyteller and essayist. I tell true stories about strange things.',
    performerType: 'STORYTELLER' as const,
    instruments: [],
    genres: ['personal narrative', 'humor'],
    performanceCount: 6,
    instagramHandle: null,
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_08',
  },
  {
    id: 'dummy_user_09',
    email: 'carlos.mendez@ondeck.test',
    name: 'Carlos Mendez',
    displayName: 'Carlos',
    bio: 'Bassist. Holding it down since 2010.',
    performerType: 'MUSICIAN' as const,
    instruments: ['bass', 'upright bass'],
    genres: ['latin jazz', 'salsa', 'funk'],
    performanceCount: 29,
    instagramHandle: 'carlosmendeznyc',
    avatarUrl: 'https://i.pravatar.cc/400?u=dummy_user_09',
  },
  {
    id: 'dummy_user_10',
    email: 'alex.jordan@ondeck.test',
    name: 'Alex Jordan',
    displayName: 'Alex Jordan',
    bio: 'Multi-instrumentalist. I play whatever fits the room.',
    performerType: 'MUSICIAN' as const,
    instruments: ['saxophone', 'flute', 'clarinet'],
    genres: ['jazz', 'classical', 'experimental'],
    performanceCount: 9,
    instagramHandle: 'alexjordanplays',
    avatarUrl: null, // no photo set — tests the fallback
  },
];

// ─── Signup details (note to host, socials, slot order) ───────────────────────

const SIGNUP_DETAILS = [
  { note: null,                              tiktok: null,            status: 'PERFORMED' as const },
  { note: 'I need 7 minutes, not 5. Please.', tiktok: 'sarahchen.comedy', status: 'PERFORMED' as const },
  { note: null,                              tiktok: null,            status: 'SIGNED_UP' as const },
  { note: 'Can I go before the break?',     tiktok: null,            status: 'SIGNED_UP' as const },
  { note: null,                              tiktok: 'raykim.drums',  status: 'SIGNED_UP' as const },
  { note: 'First time here! Be gentle.',    tiktok: null,            status: 'SIGNED_UP' as const },
  { note: null,                              tiktok: null,            status: 'SIGNED_UP' as const },
  { note: 'Story runs about 6 minutes.',    tiktok: null,            status: 'SIGNED_UP' as const },
  { note: null,                              tiktok: 'carlosnyc',     status: 'SIGNED_UP' as const },
  { note: 'Bringing my full horn setup.',   tiktok: null,            status: 'SIGNED_UP' as const },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding test roster...\n');

  // 1. Upsert dummy users
  console.log('Creating dummy users...');
  for (const u of DUMMY_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        performerType: u.performerType,
        instruments: u.instruments,
        genres: u.genres,
        performanceCount: u.performanceCount,
      },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        performerType: u.performerType,
        instruments: u.instruments,
        genres: u.genres,
        performanceCount: u.performanceCount,
      },
    });
    console.log(`  ✓ ${u.displayName}`);
  }

  // 2. Find or create a venue
  console.log('\nFinding or creating test venue...');
  let venue = await prisma.venue.findFirst({
    where: { name: 'The Test Room' },
  });
  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: 'The Test Room',
        address: '123 Main St',
        neighborhood: 'Lower East Side',
        city: 'New York',
        state: 'NY',
      },
    });
  }
  console.log(`  ✓ ${venue.name}`);

  // 3. Find or create the test event
  console.log('\nFinding or creating test event...');
  let event = await prisma.event.findFirst({
    where: { title: 'Test Open Mic Night' },
  });
  if (!event) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    event = await prisma.event.create({
      data: {
        title: 'Test Open Mic Night',
        type: 'OPEN_MIC',
        venueId: venue.id,
        city: venue.city,
        state: venue.state,
        startsAt: tomorrow,
        description: 'A test event for development. Showcasing the roster feature.',
        coverCharge: 'Free',
        slotDuration: '5 min',
        signUpMethod: 'APP',
        signupsEnabled: true,
        maxSlots: 12,
        isRecurring: false,
        genres: ['jazz', 'comedy', 'spoken word'],
        backline: ['drum kit', 'bass amp', 'piano'],
        hostId: DUMMY_USERS[0].id,
        submittedBy: DUMMY_USERS[0].id,
      },
    });
  } else {
    console.log('  (already exists, reusing)');
  }
  console.log(`  ✓ "${event.title}" (id: ${event.id})`);

  // 4. Create signups (skip if already exist)
  console.log('\nCreating signups...');
  for (let i = 0; i < DUMMY_USERS.length; i++) {
    const user = DUMMY_USERS[i];
    const details = SIGNUP_DETAILS[i];

    const existing = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });

    if (existing) {
      console.log(`  – ${user.displayName} already on roster, skipping`);
      continue;
    }

    await prisma.eventSignup.create({
      data: {
        eventId: event.id,
        userId: user.id,
        performerType: user.performerType,
        instruments: user.instruments,
        genres: user.genres,
        note: details.note,
        instagramHandle: user.instagramHandle,
        tiktokHandle: details.tiktok,
        slotOrder: i,
        status: details.status,
      },
    });

    console.log(`  ✓ #${i + 1} ${user.displayName} (${details.status})`);
  }

  console.log(`\nDone! Event ID: ${event.id}`);
  console.log(`Open it in the app: /events/${event.id}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
