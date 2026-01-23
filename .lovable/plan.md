
<context>
You have a real event row in the live database (`27e20e0c-eda0-4827-898b-b013d7f077ef`) and the SELECT policy for `public.events` now explicitly allows `visibility = 'public'`, so the backend should be able to return it.

Yet:
1) Visiting `/events/<id>` is blank.
2) `/events` shows no upcoming events.

From the codebase inspection, the core problem is not the database anymore: it’s the frontend routing and (secondarily) the “upcoming” filter logic.
</context>

<what-is-actually-broken>
<item>
<problem>There is no route defined for the event detail page.</problem>
<evidence>`EventView.tsx` exists, and links are generated as `/events/${event.id}` (feed announcement and Events list cards), but `src/App.tsx` does not include a `<Route path="/events/:id" ... />`.</evidence>
<impact>Any link to `/events/<uuid>` will not match a route, so React Router falls through to the “not found / fallback” behavior. Depending on your NotFound implementation + ErrorBoundary, this can look like a blank page.</impact>
</item>

<item>
<problem>`/events` is currently behind `ProtectedRoute`.</problem>
<evidence>`src/App.tsx` wraps `/events` in `<ProtectedRoute>`.</evidence>
<impact>If the user is not logged in (common when clicking links from a public feed post, or opening a shared link in a fresh browser), they won’t see the events list at all. This often gets interpreted as “no events”, especially if the redirect UI is subtle or the user lands somewhere unexpected.</impact>
</item>

<item>
<problem>The “upcoming” filter excludes events with `end_date = null`.</problem>
<evidence>`getEvents()` uses `gte('end_date', nowISO)` when `upcoming=true`.</evidence>
<impact>Any event created without an end date will never show as upcoming even if it is in the future. This may not explain the specific FOSDEM event (it has `end_date`), but it will cause “no upcoming events” in many real cases and needs fixing anyway.</impact>
</item>
</what-is-actually-broken>

<implementation-plan>
<phase title="A) Fix routing so event links work (fixes blank page)">
<step>In `src/App.tsx`, add a public route for the event detail page: `path="/events/:id"` rendering `<EventView />`.</step>
<step>Also add the missing edit route referenced in `EventView.tsx`: `path="/events/edit/:id"` rendering `<EventEdit />` inside `<ProtectedRoute>`.</step>
<step>Confirm you still have (or add) a catch-all `path="*"` route to `NotFound` so missing routes don’t appear blank.</step>
<expected-result>Opening `https://nolto.social/events/27e20e0c-eda0-4827-898b-b013d7f077ef` renders the EventView UI (or “Event not found” if the id is wrong), instead of a blank page.</expected-result>
</phase>

<phase title="B) Make events discoverable to logged-out users (fixes /events confusion)">
<step>Move `/events` out of `ProtectedRoute` so it’s publicly accessible (since you already allow reading public events via database policy).</step>
<step>Keep `/events/create` and `/events/edit/:id` protected.</step>
<step>Update navigation components (Navbar/Mobile nav) so “Events” is visible for everyone (optional if it already is).</step>
<expected-result>Visiting `/events` while logged out shows upcoming public events. Visiting while logged in continues to work.</expected-result>
</phase>

<phase title="C) Fix upcoming filtering so it’s correct for all events">
<step>Update `getEvents({ upcoming: true })` in `src/services/eventService.ts` to treat “upcoming” as:
- `end_date >= now` (for events with an end date), OR
- (`end_date IS NULL` AND `start_date >= now`) (for events without end date)</step>
<step>Implement this using a Supabase `.or(...)` expression so you don’t lose multi-hour/multi-day events that already started but haven’t ended.</step>
<step>Additionally, in `createEvent()`, if `end_date` is missing, set it to `start_date` before inserting. This prevents future “invisible upcoming events” and makes date logic simpler everywhere.</step>
<expected-result>Events with or without end dates show up correctly as “upcoming”.</expected-result>
</phase>

<phase title="D) Add fast diagnostics so this can’t silently fail again">
<step>In `Events.tsx`, if the query returns an empty list, optionally show a small debug hint (only in development) or a clearer empty state (“No upcoming public events”).</step>
<step>In `eventService.getEvents()`, log Supabase errors with enough detail to see whether it’s RLS, query syntax, or network.</step>
</phase>

<phase title="E) Verification checklist (what we will test)">
<step>Open the exact link from the feed post: `/events/27e20e0c-eda0-4827-898b-b013d7f077ef` and confirm it renders the event.</step>
<step>Open `/events` while logged out: confirm the FOSDEM event appears in “Upcoming”.</step>
<step>Open `/events` while logged in: confirm it still works, RSVP status logic still works.</step>
<step>Create a new event with no end date: confirm it shows in Upcoming.</step>
<step>Open a random invalid event id: confirm you get the “Event not found” UI (not blank).</step>
</phase>
</implementation-plan>

<notes>
The RLS migration you shared looks fine for public visibility. The reason nothing changed in the UI is that the frontend currently can’t route to `/events/:id`, and `/events` being protected makes public discovery unreliable. Fixing routing + making the list public will immediately address the “blank page” and “no upcoming events” reports, and the filter fix prevents the next wave of “events don’t show” bugs.
</notes>
