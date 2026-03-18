# On-Deck — Ideas & Notes

A running list of things to build, improve, or remember. Add to this file whenever.

---

## Map

- [ ] **Tappable markers → event/venue** — markers currently show a tooltip. Should navigate to event detail (single event) or a filtered list (multiple events at same venue). Need to add `eventIds` to `VenueMarker` and wire up `router.push`.
- [ ] **"Tonight" toggle on map** — show all upcoming vs. tonight only. Map is most useful as a real-time "what's on now" view, not general discovery.
- [ ] **Venue coordinate coverage** — most venues added via the submit form have `lat: null / lng: null` and don't appear on the map at all. Fix: geocode on the API side when a venue is created (Google Maps Geocoding API), or run a backfill script for existing venues.
- [ ] **User location dot** — `react-native-maps` has `showsUserLocation` as a single prop. Trivial once location permission is in place.
- [ ] **Marker clustering** — dense cities (NYC) get overlapping pins. Needs a native clustering library — lower priority.

---

## Performer Profiles

- [ ] **Upcoming shows on profile** — currently only shows past (PERFORMED) history. Performers want "catch me next Thursday at Rockwood" visible on their public profile. One extra API endpoint filtering upcoming SIGNED_UP events.
- [ ] **Website / booking link** — a single `websiteUrl` field on User. High value for musicians (Bandcamp, SoundCloud, personal site).
- [ ] **Featured performance** — let performers pin a highlight (a clip, a notable show) to the top of their history. Could be a `featured` boolean on EventSignup, or a separate `mediaUrl` field.
- [ ] **Social proof / "active since"** — subtle "member since [year]" derived from `createdAt`. Distinguishes veterans from brand-new accounts.
- [ ] **Performer profile photo upload** — currently avatarUrl is a pasted URL. Should support picking from camera roll (expo-image-picker is already installed) and uploading to storage (S3 / Cloudflare R2). No storage service wired up yet.

---

## Recurring Events

- [ ] **Recurring event roster problem** — weekly open mics share one DB row, so rosters accumulate across all occurrences forever. Fix: add `recurringParentId` + `occurrenceDate` fields, spawn individual occurrence rows, and attach rosters to occurrences not the parent. This is a significant schema change.

---

## Host Tools

- [ ] **Drag-to-reorder roster** — the API supports `slotOrder` updates but the roster screen has no drag UI. Needs gesture-based reordering (react-native-draggable-flatlist or similar).
- [ ] **Host direct-add** — hosts can't add walk-in performers who haven't self-signed-up via the app. Need a search/add UI in the roster screen.

---

## Discovery / Search

- [ ] **Search and filter on discover tab** — the API already supports filters (city, type, date range, free/paid, full-text `q`). The UI doesn't expose them. A filter sheet or search bar would unlock a lot of latent functionality.
- [ ] **"Near me" discovery** — once device location is live on the map, the discover tab could also default to nearby events rather than requiring manual city selection.

---

## Misc

- [ ] **Cancel signup from profile** — no UI button to remove yourself from a roster once you've signed up.
- [ ] **Edit event cover photo** — EditEventModal doesn't support swapping the Unsplash photo after submission.
- [ ] **Push notifications** — notify performers when the show is starting, when they move up in the lineup, or when a host marks them as next.
