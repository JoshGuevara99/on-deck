# On Deck — Platform Game Plan

## The Vision Shift

On Deck is not an event listing app. It is a **participatory performance platform** — the only tool built
specifically for the open mic / jam session ecosystem, from both sides of the stage.

- **Attendees** discover events, save favorites, see who's going
- **Performers** sign up for slots, build a performance history, get reminded
- **Hosts** manage their roster, know who's coming, stop drowning in DMs

---

## Why Not Meetup / Facebook Events / Eventbrite?

| Tool | Their model | Why it fails here |
|---|---|---|
| Meetup.com | Community groups, attendee RSVPs | No performer identity, no slot concept, charges organizers ~$30/mo, dated UX, built for hiking clubs |
| Facebook Events | Broadcast + attendee RSVP | No performer sign-up, no slot order, algorithm buries events, requires Facebook account |
| Eventbrite | Ticketed event management | Built for audience, not participants. No "I'm performing" concept at all |
| Bandsintown / Songkick | Announced shows | For watching established artists, not for participating |
| SignUpGenius | Generic sign-up sheets | No discovery, no identity, no mobile UX, no community |
| Notes app / napkin | Personal list | The host is still the collection point — they still drown in DMs |

**The core insight:** Every existing tool treats the user as an audience member. On Deck treats them as a
participant. That gap is the entire moat.

Additionally: none of these tools have discovery AND sign-up in one place, for this specific event category.
A host on Meetup still has to manage their slot list separately. On Deck collapses that into one workflow.

---

## Who Are the Users?

### Attendees (the default, largest group)
- People who love live music / comedy / poetry but don't perform
- Tourists, curious locals, friends dragged along
- Pain: don't know what's happening tonight, no reliable source for participatory events
- Want: find something good nearby, know if it's worth going, maybe bring a friend
- **No instrument, no performer type required — just show up**

### Performers
- Musicians, comedians, poets, storytellers, spoken word artists, improv performers
- **Instrument is optional** — a comedian's "instrument" is their voice. A poet has none.
  The identity model is: `performerType` first, instruments only shown for musicians.
- Range from total beginners ("my first open mic") to regulars who go 3x/week
- Pain: don't know what's happening tonight, don't know if there's space, forget to show up
- Want: find events fast, sign up in advance, not ghost accidentally

### Hosts / Organizers
- Run a weekly or monthly open mic, jam session, comedy night, etc.
- Usually doing this as a side role (bar employee, musician themselves, venue booker)
- Pain: collecting sign-ups via DM chaos, no-shows, showing up without knowing who's coming
- Want: a pre-built roster, know the genres/styles showing up, run a tighter show

### Venues
- Bars, coffee shops, art spaces, music venues
- Care that their events are well-attended and well-run
- Currently have zero visibility into performer demand before the night

---

## Phased Game Plan

---

### Phase 1 — Flexible User Identity
**Goal:** Give users an identity that works whether they perform, attend, or both.
All fields are optional — the app works fine without any of them.

**The instrument problem:**
Not everyone performs. Not every performer plays an instrument. A comedian, poet, or spoken
word artist has no instrument. Someone who just loves open mics has neither. The model must
reflect this:

- `performerType` determines what identity fields are shown
- `MUSICIAN` → shows instrument picker
- `COMEDIAN`, `POET`, `STORYTELLER`, `OTHER` → instrument field hidden entirely
- No `performerType` set → user is treated as an attendee, no performer fields shown
- A user can be an attendee at one event and a performer at another — roles are per-action, not locked

**DB changes:**
```prisma
model User {
  // existing fields...
  displayName      String?
  bio              String?
  performerType    PerformerType?   // null = attendee / not set
  instruments      String[]         // only relevant for MUSICIAN type
  genres           String[]         // broad: "jazz", "stand-up", "spoken word", "hip-hop"
  performanceCount Int              @default(0)  // incremented when host marks as PERFORMED
}

enum PerformerType {
  MUSICIAN
  COMEDIAN
  POET
  STORYTELLER
  OTHER
}
```

**App changes:**
- Profile tab: editable display name, bio, optional performer section
- Onboarding: "Are you here to discover or perform?" — soft prompt, fully skippable
- Instrument picker only shown when `performerType = MUSICIAN`
- Profile shows attend history + performance history as separate sections

---

### Phase 2 — Event Sign-Ups (Both Sides)
**Goal:** Two actions on every sign-up-enabled event card: attend RSVP and performer slot sign-up.

**The distinction:**
- `I'm going` — attendee RSVP, low friction, no account required ideally. Tells the host
  "14 people are planning to come." Social proof for other users.
- `Sign up to perform` — slot request, requires account. Puts you on the roster.

**DB changes:**
```prisma
model Event {
  // existing fields...
  signupsEnabled  Boolean       @default(false)
  maxSlots        Int?
  hostId          String?
  host            User?         @relation("HostedEvents", fields: [hostId], references: [id])
  signups         EventSignup[]
  attendees       EventAttendee[]
}

model EventSignup {
  id            String        @id @default(cuid())
  eventId       String
  userId        String
  performerType PerformerType?  // snapshot at time of sign-up
  instruments   String[]        // empty for comedians/poets — that's fine
  genres        String[]
  note          String?         // optional note to host ("I play originals, ~10 min set")
  slotOrder     Int?            // set by host when reordering
  status        SignupStatus    @default(SIGNED_UP)
  createdAt     DateTime        @default(now())

  event         Event           @relation(fields: [eventId], references: [id])
  user          User            @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
}

model EventAttendee {
  id        String   @id @default(cuid())
  eventId   String
  userId    String?  // nullable — allow anonymous "I'm going" in future
  createdAt DateTime @default(now())

  event     Event    @relation(fields: [eventId], references: [id])
  user      User?    @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
}

enum SignupStatus {
  SIGNED_UP
  PERFORMED
  NO_SHOW
  REMOVED
}
```

**Event card UI (when signups enabled):**
```
┌─────────────────────────────────────────┐
│ OPEN MIC                     8:00 PM ↓  │
│ Tuesday Night Open Mic                  │
│ THE GUTTER · Williamsburg               │
│                                         │
│  14 going  ·  8 signed up  ·  2 left   │
│                                         │
│  [I'M GOING]   [SIGN UP TO PERFORM]     │
└─────────────────────────────────────────┘
```

**Sign-up modal (performer):**
- Pre-fills from profile if set
- `performerType` selector first → determines what fields appear next
- Musicians: instrument(s) + genres
- Comedians/poets: just genres / style ("observational", "spoken word")
- Optional note to host
- Confirmation: "You're #4. See you tonight at The Gutter."

**API:**
- `POST /events/:id/signups` — create performer signup
- `DELETE /events/:id/signups` — cancel own signup
- `POST /events/:id/attendees` — RSVP as attendee
- `GET /events/:id/signups` — public: count only; host: full roster

---

### Phase 3 — Host Dashboard
**Goal:** Hosts manage their roster from the app before and during the show.

**App changes:**
- Submit tab: "Enable performer sign-ups" toggle + max slots field
- Profile tab: "My Events" section with signup counts per event
- Roster screen:
  - Full list: name, performer type, instruments/genres, note
  - Drag to reorder slots
  - Mark as PERFORMED / NO_SHOW during the show
  - Close signups manually or auto-close when full
  - Share button → deep link to event card for IG bio

**Why the share link matters:** Host posts their On Deck event link in their IG bio.
Followers tap, land directly on the event card, sign up. Zero friction. Host gets organic
user acquisition for free — every host is a distribution channel.

---

### Phase 4 — Notifications
**Goal:** Nobody ghosts. Hosts aren't surprised.

**Triggers:**
- Performer: "You're #4 tonight at The Gutter. Doors at 7." (2 hours before)
- Performer: "Sign-ups are open for Tuesday Night Mic" (for users who've attended before)
- Attendee: "You said you were going to [Event] tonight — starts in 2 hours"
- Host: "[N] new sign-ups for tonight"
- Host: "Sign-ups closed — your roster is ready" (when max slots hit)

**Implementation:** Expo Push Notifications + cron job on API server.

---

### Phase 5 — Discovery Network Effects
**Goal:** Use behavioral data to make the app smarter over time.

- Trending events: more sign-ups = surfaces higher in Discover
- Performer reputation: "Performed at 24 events" visible on profile — hosts trust you won't ghost
- Host can browse performer profiles and personally invite regulars
- Venue analytics: "32 performers signed up for events here this month"
- Genre/style matching: surface events that match what you play or want to see

---

## Full User Flows

**Attendee (no performer intent):**
1. Open app → browse Discover, no account needed
2. Find something interesting → tap "I'm going" → see "15 going"
3. Optional: create account to save event and get reminder
4. Show up, have a good time

**Performer — musician:**
1. Sign up → onboarding: "I perform" → select MUSICIAN → add guitar, jazz
2. Browse Discover → event shows "3 spots left"
3. Tap "Sign up to perform" → pre-filled: guitar, jazz → add note → confirm as #7
4. Reminder 2 hours before show
5. Perform → host marks PERFORMED → profile shows "8 performances"

**Performer — comedian:**
1. Sign up → onboarding: "I perform" → select COMEDIAN → add "observational, dark humor"
2. No instrument field ever shown
3. Same sign-up flow: genres only
4. Same reminder, same roster entry, same history

**Host:**
1. Submit event → toggle "Enable sign-ups" → set 10 slots
2. Post On Deck deep link in IG bio
3. Tuesday afternoon: open app → 8 performers on roster (mix of musicians, a comedian, a poet)
4. Reorder list → start show → tap through as people go up
5. Zero DMs. Zero napkins. Roster saved for next week's patterns.

---

## What to Build First (MVP Slice)

The smallest complete loop:

1. Schema: `signupsEnabled` + `maxSlots` on `Event`, `EventSignup` table, `EventAttendee` table
2. Schema: `performerType` + `instruments` + `genres` on `User`
3. API: signup + attendee endpoints
4. Event card: "I'm going" + "Sign up to perform" buttons with counts
5. Sign-up modal: performer type → contextual fields
6. Profile tab: "My Events" (host roster) + "My Sign-Ups" (performer history)

Notifications and network effects come after. This slice alone is a complete,
demonstrable product that no competitor has.
