import { PrismaClient, EventType, SignUpMethod } from '@prisma/client';

const prisma = new PrismaClient();

const venues = [
  { name: 'The Velvet Lounge',     address: '521 Congress Ave',      neighborhood: 'Congress Ave', city: 'Austin', state: 'TX' },
  { name: 'Hole in the Wall',      address: '2538 Guadalupe St',     neighborhood: 'The Drag',     city: 'Austin', state: 'TX' },
  { name: 'The Continental Club',  address: '1315 S Congress Ave',   neighborhood: 'S Congress',   city: 'Austin', state: 'TX' },
  { name: 'The Parish',            address: '214 E 6th St',          neighborhood: '6th Street',   city: 'Austin', state: 'TX' },
  { name: 'Cactus Cafe',           address: '2247 Guadalupe St',     neighborhood: 'UT Campus',    city: 'Austin', state: 'TX' },
  { name: "Antone's Nightclub",    address: '305 E 5th St',          neighborhood: 'Downtown',     city: 'Austin', state: 'TX' },
  { name: 'The Drafting Room',     address: '7112 Ed Bluestein Blvd',neighborhood: 'East Austin',  city: 'Austin', state: 'TX' },
  { name: 'Spider House Ballroom', address: '2908 Fruth St',         neighborhood: 'Hyde Park',    city: 'Austin', state: 'TX' },
];

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database…');

  // Create venues
  const [velvet, holeInWall, continental, parish, cactus, antones, drafting, spider] =
    await Promise.all(
      venues.map((v) =>
        prisma.venue.upsert({
          where: { id: v.name }, // placeholder; real upsert uses name+city
          update: {},
          create: v,
        }).catch(() =>
          // If unique constraint fails just find it
          prisma.venue.findFirstOrThrow({
            where: { name: v.name, city: v.city },
          }),
        ),
      ),
    );

  // Wipe and re-seed events for a predictable state
  await prisma.event.deleteMany({});

  const events: Parameters<typeof prisma.event.createMany>[0]['data'] = [
    // ── Tonight ───────────────────────────────────────────────────────────────
    {
      venueId: velvet!.id,
      title: 'Tuesday Night Jazz Jam',
      type: EventType.JAM_SESSION,
      startsAt: daysFromNow(0, 20),
      description: 'House jazz trio holds it down every Tuesday. All horns, strings, and keys welcome. Just bring your axe — the rhythm section has you covered.',
      genres: ['Jazz', 'Blues', 'Soul'],
      coverCharge: 'Free',
      backline: ['Drum kit', 'Bass amp', 'Upright piano'],
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Tuesday',
    },
    {
      venueId: holeInWall!.id,
      title: "Songwriter's Circle",
      type: EventType.OPEN_MIC,
      startsAt: daysFromNow(0, 19, 30),
      description: 'Original songs only. A safe space for works-in-progress. 3-minute slots, no covers, no judgement. Intimate listening-room energy.',
      genres: ['Acoustic', 'Folk', 'Indie'],
      coverCharge: 'Free',
      slotDuration: '3 min',
      backline: ['Guitar amp', 'Mic & stand'],
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Tuesday',
    },
    {
      venueId: spider!.id,
      title: 'Open Mic Comedy Night',
      type: EventType.COMEDY_NIGHT,
      startsAt: daysFromNow(0, 20, 30),
      description: 'Five-minute sets. New material only — this is a crowd that can tell. Sign up starts at 8 PM. Hosted by Marcus Webb.',
      genres: ['Stand-up', 'Improv'],
      coverCharge: 'Free',
      slotDuration: '5 min',
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Tuesday',
    },
    // ── Tomorrow ──────────────────────────────────────────────────────────────
    {
      venueId: continental!.id,
      title: 'Blues Jam Session',
      type: EventType.JAM_SESSION,
      startsAt: daysFromNow(1, 21),
      description: "Austin's longest-running blues jam. House band leads, all players rotate through. Blues and soul only — come ready to wail.",
      genres: ['Blues', 'R&B', 'Soul'],
      coverCharge: '$5',
      slotDuration: '2–3 songs',
      backline: ['Full backline provided'],
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Wednesday',
    },
    {
      venueId: parish!.id,
      title: 'Hip Hop Open Mic',
      type: EventType.OPEN_MIC,
      startsAt: daysFromNow(1, 20),
      description: 'Bars, beats, and freestyles welcome. Bring your own beats on USB or go a cappella. Hosted by DJ Kwest. Expect a real crowd.',
      genres: ['Hip Hop', 'Spoken Word', 'R&B'],
      coverCharge: 'Free',
      slotDuration: '5 min',
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Thursday',
    },
    {
      venueId: drafting!.id,
      title: 'Spoken Word & Poetry Night',
      type: EventType.POETRY_SLAM,
      startsAt: daysFromNow(1, 19, 30),
      description: 'Open-format poetry night. Slam, spoken word, experimental — all welcome. 4-minute limit. No hate speech, no exceptions.',
      genres: ['Poetry', 'Spoken Word', 'Experimental'],
      coverCharge: 'Free',
      slotDuration: '4 min',
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Wednesday',
    },
    // ── Coming up ─────────────────────────────────────────────────────────────
    {
      venueId: cactus!.id,
      title: 'Acoustic Open Stage',
      type: EventType.OPEN_MIC,
      startsAt: daysFromNow(3, 18, 30),
      description: 'Intimate listening room, seated audience, no talking. Originals and covers welcome. Arrive by 6 PM to sign up. Treat it like a real show.',
      genres: ['Acoustic', 'Country', 'Folk', 'Classical'],
      coverCharge: 'Free',
      slotDuration: '5 min',
      backline: ['Mic & stand', 'DI box'],
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Saturday',
    },
    {
      venueId: antones!.id,
      title: 'Funk & Soul Jam',
      type: EventType.JAM_SESSION,
      startsAt: daysFromNow(4, 21, 30),
      description: 'Groove-forward players only. Expect Meters, James Brown, Prince, and plenty of originals. No noodling — serve the groove or step aside.',
      genres: ['Funk', 'Soul', 'R&B'],
      coverCharge: '$10',
      slotDuration: '3–4 songs',
      backline: ['Full backline provided'],
      signUpMethod: SignUpMethod.ONLINE,
      isRecurring: false,
    },
    {
      venueId: spider!.id,
      title: 'Sketch Comedy Showcase',
      type: EventType.COMEDY_NIGHT,
      startsAt: daysFromNow(5, 20),
      description: 'Local sketch troupes take the stage. New material every week. Come to laugh, stay for the weird stuff.',
      genres: ['Sketch', 'Improv', 'Stand-up'],
      coverCharge: '$5',
      slotDuration: '10 min',
      signUpMethod: SignUpMethod.ONLINE,
      isRecurring: true,
      recurringDescription: 'Every Sunday',
    },
    {
      venueId: drafting!.id,
      title: 'Life Drawing Open Studio',
      type: EventType.OPEN_STUDIO,
      startsAt: daysFromNow(6, 18),
      description: 'Bring your sketchbook or canvas. Live model, 20-minute and 5-minute poses. All skill levels welcome. Just show up.',
      genres: ['Visual Art', 'Drawing', 'Figure Study'],
      coverCharge: '$8',
      signUpMethod: SignUpMethod.DOOR,
      isRecurring: true,
      recurringDescription: 'Every Monday',
    },
    {
      venueId: holeInWall!.id,
      title: 'Experimental Music Workshop',
      type: EventType.WORKSHOP,
      startsAt: daysFromNow(7, 14),
      description: 'Noise, drone, and experimental electronics. Bring pedals, laptops, weird instruments. Facilitated open session — no structure, all exploration.',
      genres: ['Experimental', 'Electronic', 'Noise'],
      coverCharge: 'Free',
      slotDuration: 'Open',
      signUpMethod: SignUpMethod.APP,
      isRecurring: false,
    },
  ];

  await prisma.event.createMany({ data: events });

  console.log(`✓ Seeded ${venues.length} venues and ${events.length} events.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
