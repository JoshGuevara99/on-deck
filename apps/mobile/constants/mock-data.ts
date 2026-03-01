import type { EventType } from '@on-deck/shared';

export interface MockVenue {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

export interface MockEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: Date;
  venue: MockVenue;
  description: string;
  genres: string[];
  isRecurring: boolean;
  recurringDescription?: string;
  backline?: string[];
  coverCharge: string;
  slotDuration?: string;
  signUpMethod: 'door' | 'online' | 'app';
}

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: '1',
    title: 'Tuesday Night Jazz Jam',
    type: 'JAM_SESSION',
    startsAt: daysFromNow(0, 20, 0),
    venue: {
      id: 'v1',
      name: 'The Velvet Lounge',
      address: '521 Congress Ave',
      neighborhood: 'Congress Ave',
      city: 'Austin',
      state: 'TX',
    },
    description:
      'House jazz trio holds it down every Tuesday. All horns, strings, and keys welcome. Just bring your axe — the rhythm section has you covered.',
    genres: ['Jazz', 'Blues', 'Soul'],
    isRecurring: true,
    recurringDescription: 'Every Tuesday',
    backline: ['Drum kit', 'Bass amp', 'Upright piano'],
    coverCharge: 'Free',
    signUpMethod: 'door',
  },
  {
    id: '2',
    title: "Songwriter's Circle",
    type: 'OPEN_MIC',
    startsAt: daysFromNow(0, 19, 30),
    venue: {
      id: 'v2',
      name: 'Hole in the Wall',
      address: '2538 Guadalupe St',
      neighborhood: 'Drag',
      city: 'Austin',
      state: 'TX',
    },
    description:
      'Original songs only. A safe space for works-in-progress. 3-minute slots, no covers, no judgement. Intimate listening-room energy.',
    genres: ['Acoustic', 'Folk', 'Indie'],
    isRecurring: true,
    recurringDescription: 'Every Tuesday',
    backline: ['Guitar amp', 'Mic & stand'],
    coverCharge: 'Free',
    slotDuration: '3 min',
    signUpMethod: 'door',
  },
  {
    id: '3',
    title: 'Blues Jam Session',
    type: 'JAM_SESSION',
    startsAt: daysFromNow(1, 21, 0),
    venue: {
      id: 'v3',
      name: 'The Continental Club',
      address: '1315 S Congress Ave',
      neighborhood: 'S Congress',
      city: 'Austin',
      state: 'TX',
    },
    description:
      "Austin's longest-running blues jam. House band leads, all players rotate through. Blues and soul only — come ready to wail.",
    genres: ['Blues', 'R&B', 'Soul'],
    isRecurring: true,
    recurringDescription: 'Every Wednesday',
    backline: ['Full backline provided'],
    coverCharge: '$5',
    slotDuration: '2–3 songs',
    signUpMethod: 'door',
  },
  {
    id: '4',
    title: 'Hip Hop Open Mic',
    type: 'OPEN_MIC',
    startsAt: daysFromNow(1, 20, 0),
    venue: {
      id: 'v4',
      name: 'The Parish',
      address: '214 E 6th St',
      neighborhood: '6th Street',
      city: 'Austin',
      state: 'TX',
    },
    description:
      'Bars, beats, and freestyles welcome. Bring your own beats on USB or go a cappella. Hosted by DJ Kwest. Expect a real crowd.',
    genres: ['Hip Hop', 'Spoken Word', 'R&B'],
    isRecurring: true,
    recurringDescription: 'Every Thursday',
    coverCharge: 'Free',
    slotDuration: '5 min',
    signUpMethod: 'door',
  },
  {
    id: '5',
    title: 'Acoustic Open Stage',
    type: 'OPEN_MIC',
    startsAt: daysFromNow(3, 18, 30),
    venue: {
      id: 'v5',
      name: 'Cactus Cafe',
      address: '2247 Guadalupe St',
      neighborhood: 'UT Campus',
      city: 'Austin',
      state: 'TX',
    },
    description:
      'Intimate listening room, seated audience, no talking. Originals and covers welcome. Arrive by 6 PM to sign up. Treat it like a real show.',
    genres: ['Acoustic', 'Country', 'Folk', 'Classical'],
    isRecurring: true,
    recurringDescription: 'Every Saturday',
    backline: ['Mic & stand', 'DI box'],
    coverCharge: 'Free',
    slotDuration: '5 min',
    signUpMethod: 'door',
  },
  {
    id: '6',
    title: 'Funk & Soul Jam',
    type: 'JAM_SESSION',
    startsAt: daysFromNow(4, 21, 30),
    venue: {
      id: 'v6',
      name: "Antone's Nightclub",
      address: '305 E 5th St',
      neighborhood: 'Downtown',
      city: 'Austin',
      state: 'TX',
    },
    description:
      'Groove-forward players only. Expect Meters, James Brown, Prince, and plenty of originals. No noodling — serve the groove or step aside.',
    genres: ['Funk', 'Soul', 'R&B'],
    isRecurring: false,
    backline: ['Full backline provided'],
    coverCharge: '$10',
    slotDuration: '3–4 songs',
    signUpMethod: 'online',
  },
];
