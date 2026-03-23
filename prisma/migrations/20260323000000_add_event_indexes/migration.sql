-- AddIndex: Event(city, startsAt) — most common query pattern (city filter + date range)
CREATE INDEX "Event_city_startsAt_idx" ON "Event"("city", "startsAt");

-- AddIndex: Event(startsAt) — date range queries without city filter
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- AddIndex: Event(hostId) — host's event roster lookup
CREATE INDEX "Event_hostId_idx" ON "Event"("hostId");

-- AddIndex: Event(submittedBy) — user's submitted events
CREATE INDEX "Event_submittedBy_idx" ON "Event"("submittedBy");

-- AddIndex: EventSignup(eventId, status) — slot counting on every signup creation
CREATE INDEX "EventSignup_eventId_status_idx" ON "EventSignup"("eventId", "status");
