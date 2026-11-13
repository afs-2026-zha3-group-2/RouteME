# RouteMe: 8-Day MVP Full-Loop Design

## 1. Product Positioning

RouteMe is a **route-driven travel-companion matching app for university students**.

RouteMe is neither a general social app nor a booking or navigation platform. A real trip plan provides the reason for connection. Users gain inspiration from trips, publish plans, discover people with similar routes and dates, establish connections, travel together, and share experiences that inspire future trips.

> **Travel is the product context. Social connection helps users turn travel intentions into real journeys.**

---

## 2. Product Value Loop

> **Travel inspiration → Publish a trip → Discover companions → Build a connection → Travel together → Share the experience → Create new travel inspiration**

This loop expresses the Travel theme more clearly than a simple publish-match-chat flow.

### 2.1 Travel Inspiration

Users browse public trip plans and post-trip experiences to discover destinations, routes, and travel styles.

The MVP does not need an advanced recommendation algorithm. It provides:

- A public trip-plan list;
- Simple post-trip stories;
- Destination and date filters;
- Interest tags such as photography, food, seaside, and hiking.

### 2.2 Publish a Trip

Users turn inspiration into an actionable plan by entering:

- Destination;
- Start and end dates;
- Short route description;
- Desired group size;
- Interest tags;
- Optional budget and notes.

### 2.3 Discover Companions

RouteMe matches trip plans instead of matching people only by profile.

The first version uses transparent rules:

- Same destination;
- Same or nearby departure date;
- Shared interests;
- Recruiting status.

### 2.4 Build a Connection

A user reviews the trip and creator profile and submits a companion application. The creator accepts or rejects it. Text communication opens only after acceptance.

### 2.5 Travel Together

The MVP does not track live location or provide navigation. It supports pre-trip coordination and travel-connection status through confirmed companions, meeting area, itinerary, safety reminders, and a leave action.

### 2.6 Share the Experience

After the trip, participants can publish:

- A text reflection;
- Route rating;
- Optional images;
- Actual intensity;
- Advice for future travelers.

### 2.7 Create New Inspiration

Post-trip experiences appear on the original trip and inspiration feed. Other users can select “Use this trip as inspiration,” copy the destination and route into a new draft, and choose a new date and group size.

---

## 3. Core MVP Hypothesis

> After seeing a realistic trip plan, will university students publish their own plan and use destination, date, and interests to find companions? Can authentic post-trip experiences motivate the next user to create another trip?

The MVP validates three behaviors:

1. Users publish understandable trip plans;
2. Users apply to join based on a concrete route;
3. Post-trip stories generate new travel intentions.

---

## 4. Eight-Day Scope

| Loop stage | MVP implementation | Not included |
|---|---|---|
| Inspiration | Plans, stories, tags, filters | AI recommendations and infinite feeds |
| Publish | Manual destination, date, and route | AI route generation and three modes |
| Discover | Destination, date, and interest rules | Complex algorithms and nearby people |
| Connect | Apply, accept, or reject | Swipe matching and unrestricted messaging |
| Travel | Confirmed companions, chat, safety reminder | Live location, navigation, and emergency response |
| Share | Text, rating, optional images | Short video, live streaming, and full community |
| New inspiration | View stories and reuse a trip | Personalized recommendation engine |

---

## 5. Feature Priorities

### 5.1 P0: Required

#### Demo Users and Basic Profiles

Use two or three predefined accounts instead of full registration, verification, and password recovery.

Fields:

- Nickname;
- Default avatar;
- Biography;
- Three to five travel interests.

#### Travel Inspiration Home

Cards show title, destination, date, route summary, tags, creator, participants/capacity, and status.

Support destination and date filters and switching between recruiting trips and completed-trip experiences.

#### Publish a Trip

Required: title, destination, start date, end date, route description, and capacity.

Optional: meeting area, budget, interests, and notes.

#### Trip Detail

Show itinerary, dates, capacity, creator profile, participants, an application action, and post-trip stories.

#### Basic Route Matching

- Same destination: 50 points;
- Same date: 30 points;
- One-day difference: 20 points;
- Ten points per shared interest, up to 20;
- Maximum: 100.

Always explain the result. If schedule is tight, remove the percentage and keep filters and shared-interest explanations.

#### Companion Application

Applicants submit a short message, track status, and cancel while pending. Creators review, accept, or reject applications. Prevent self-application, duplicates, and applications to full or completed trips.

#### Connection and Basic Chat

After acceptance, provide one-to-one text, timestamps, message history, and manual refresh or short polling. Do not build WebSockets, voice, video, read receipts, or push notifications.

#### My Trips

Show created, applied, matched, completed, and shareable trips.

#### Minimum Safety

Include cancel, leave, report, private contact information, public meeting-place guidance, and a reminder to share key travel details with a trusted contact.

### 5.2 P1: After P0 Is Stable

#### Post-Trip Story

Only participants in a completed trip can add a text reflection, intensity rating, advice, and optional image. Display it on the original trip and inspiration home.

#### Use This Trip as Inspiration

Pre-fill destination, route, and tags in a new draft. Require the new user to choose dates, group size, and meeting point.

### 5.3 P2: Not in This Release

- Three travel modes;
- AI route generation;
- 60-second onboarding;
- Weather, document, toilet, and supermarket reminders;
- Maps, navigation, and live location;
- Booking and payment;
- Nearby people;
- Identity verification and complex reputation;
- Points and marketplace;
- Short video and live streaming;
- Full recommendation engine;
- Complex accessible-route calculation.

---

## 6. Core Pages

1. Demo user selection;
2. Travel inspiration home;
3. Publish trip;
4. Trip detail;
5. Companion applications;
6. My Trips;
7. Chat;
8. Post-trip story, P1.

Keep profile display lightweight rather than building a complex separate profile section.

---

## 7. Key User Stories

- **Inspiration:** Browse public plans and real experiences to find a suitable idea.
- **Publish:** Create a clear trip with destination, dates, route, and capacity.
- **Discover:** Filter by destination and date and understand shared interests.
- **Connect:** Apply to join and let the creator accept or reject.
- **Coordinate:** Allow only accepted companions to exchange text messages.
- **Share:** Let participants publish experience and allow others to reuse the plan as inspiration.

---

## 8. Data Model

### User
- id
- nickname
- avatarUrl
- bio
- travelInterests

### TripPlan
- id
- creatorId
- title
- destination
- startDate
- endDate
- itineraryDescription
- meetingArea
- budgetRange
- interestTags
- capacity
- participantCount
- status: RECRUITING / FULL / COMPLETED / CANCELLED
- createdAt

### TripApplication
- id
- tripPlanId
- applicantId
- message
- status: PENDING / ACCEPTED / REJECTED / CANCELLED
- createdAt

### ChatMessage
- id
- tripPlanId
- senderId
- receiverId
- content
- sentAt

### TripExperience
- id
- tripPlanId
- authorId
- content
- intensityRating: RELAXED / MODERATE / TIRING
- advice
- imageUrl
- createdAt

---

## 9. Suggested APIs

- `GET /api/inspirations?destination=&date=&type=`;
- `POST /api/trips`;
- `GET /api/trips/{id}`;
- `GET /api/trips?destination=&date=`;
- `POST /api/trips/{id}/applications`;
- `GET /api/trips/{id}/applications`;
- `PATCH /api/applications/{id}`;
- `GET /api/my/trips`;
- `GET /api/chats/{tripId}`;
- `POST /api/chats/{tripId}`;
- `POST /api/trips/{id}/experiences`;
- `POST /api/trips/{id}/copy`, or perform draft pre-filling in the frontend.

---

## 10. Eight-Day Delivery Plan

### Day 1: Freeze and Foundation

Freeze P0/P1/P2, complete wireframes and contracts, initialize the project, seed three users, six trips, and two stories, and define the demonstration script.

### Iteration 1, Days 2–3: Inspiration and Publishing

Build demo users, inspiration home, trip list, filters, publishing, and trip detail.

**Acceptance:** A user finds an experience and publishes a related plan.

### Iteration 2, Days 4–5: Discovery and Connection

Build matching explanations, applications, accept/reject/cancel, capacity control, and My Trips.

**Acceptance:** User B finds User A's trip, applies, and is accepted.

### Iteration 3, Days 6–7: Communication and Sharing

First build chat, leave, report, and state handling. After P0 is stable, build text-only post-trip sharing and “Use this trip as inspiration.”

**Acceptance:** Matched users coordinate, publish an experience, and another user creates a new plan from it.

### Day 8: Integration and Demonstration

Run end-to-end tests, fix blockers, prepare data, validate the complete loop, and add no new features.

---

## 11. Demonstration Script

1. User A finds a completed Lovers' Road photography trip on the inspiration home;
2. User A selects “Use this trip as inspiration”;
3. RouteMe pre-fills the destination and route, and User A chooses a new date;
4. User B filters by Lovers' Road and Saturday;
5. User B sees photography as a shared interest and views the trip;
6. User B applies with a short message;
7. User A accepts;
8. Both users use chat to confirm the meeting area;
9. After completion, User B posts a text story and intensity rating;
10. The story returns to the inspiration page for the next user.

A demo-only “Complete Trip” action or seeded dates may simulate the passage of time.

---

## 12. Definition of Done

A feature is done only when the frontend and backend work, data persists, loading/empty/error states exist, normal and key exception paths are tested, no manual database changes are required for the demo, the main branch starts, and the full loop has been demonstrated successfully.

Minimum tests:

- Required fields block invalid publication;
- End date cannot precede start date;
- Users cannot apply to their own trip;
- Duplicate applications fail;
- Full or completed trips reject applications;
- Only the creator processes applications;
- Acceptance increases participant count correctly;
- Unmatched users cannot chat;
- Only participants can post an experience;
- Cancel and leave actions update status correctly.

---

## 13. De-Scope Order

Remove in this order:

1. Image upload in stories;
2. Match percentage, retaining filters and shared interests;
3. Backend copy endpoint, using frontend draft pre-fill;
4. Avatar upload, using defaults;
5. Automatic refresh, using manual refresh;
6. Budget and meeting area.

Do not remove the inspiration list, trip publishing, browsing and filtering, companion application, accept/reject, minimum post-match communication, or at least text-only post-trip sharing after P0 is stable.

---

## 14. Final MVP Statement

The RouteMe MVP is a route-driven travel-companion matching product for university students. Users gain inspiration from public plans and real experiences, publish a trip containing a destination, dates, and a simple route, discover companions through destination, schedule, and interests, submit an application, and communicate after mutual agreement. After travel, participants share authentic experiences that inspire the next journey.

RouteMe creates a complete loop: **Travel inspiration → Publish a trip → Discover companions → Build a connection → Travel together → Share the experience → Create new travel inspiration.** The initial release avoids complex AI, navigation, and transactions and instead validates whether travel content can repeatedly produce real companion connections.
