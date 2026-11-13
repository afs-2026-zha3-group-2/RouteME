# RouteMe: Product Intent and Future Direction

> **One-sentence definition:** RouteMe is a route-driven social travel app for university students. It combines personalized itinerary generation, route-based companion matching, in-trip guidance, and post-trip sharing to help users move from “I want to go somewhere, but I do not know where, how, or with whom” to a safer and more achievable journey.

---

## 1. Background

Student travel products often focus on attractions, travel guides, navigation, bookings, and itinerary planning. As a result, student project teams may easily produce overlapping solutions. RouteMe should not become another student-oriented travel guide. It should focus on a more specific combination of problems:

1. Many students want to travel but cannot quickly create a route that fits them.
2. Some students are introverted or have a limited social circle. They want to meet new people but lack a natural, low-pressure setting.
3. Existing platforms contain abundant information, but users still struggle to turn it into an itinerary that fits their time, budget, interests, and physical capacity.
4. Spontaneous travelers do not have time to read many guides and need an adjustable plan quickly.
5. Students have different budgets, documents, transportation preferences, safety constraints, and weather conditions.
6. Students with disabilities or other accessibility needs often lack dependable information about accessible routes and facilities.

RouteMe's opportunity is therefore not to provide more attractions. It is to:

> **Use routes as a social medium, use AI to reduce planning effort, and use explicit safety mechanisms to reduce the risks of traveling with new people.**

---

## 2. Product Positioning

### 2.1 Name

- Chinese name: **路觅**
- English name: **RouteMe**
- Meaning: Find a route and discover people with compatible interests through that route.

### 2.2 Core Positioning

RouteMe is a route-planning and social travel platform for university students. The experience is organized around the user's intention to travel. It does not purchase tickets, make payments, or make high-risk decisions for the user. It provides:

- Personalized itinerary suggestions;
- Matching with people or groups following the same or similar routes;
- Reminders about documents, weather, budget, transport, and accessibility;
- Adjustable assistance during the journey;
- Post-trip photos, videos, stories, reviews, and reusable route templates.

### 2.3 What RouteMe Will Not Do

The initial product will not:

- Purchase flights, train tickets, attraction tickets, or hotels for users;
- Store or process bank-card payments;
- Guarantee that permits, opening hours, transport schedules, or admission rules are valid;
- Guarantee that an unfamiliar travel companion is completely safe;
- Turn “people nearby” into unrestricted messaging or precise location exposure.

Price, opening-hour, document, and weather information should display an update time, data source, and a reminder to verify critical information through official channels.

---

## 3. Differentiation

### 3.1 Differentiation Statement

Other products may answer “Where should I go?” and “What can I do there?” RouteMe focuses on:

> **What kind of trip suits me now, who may be traveling the same route, and how we can travel together more safely.**

### 3.2 Competitive References

| Reference product | Common user purpose | What RouteMe should not copy | RouteMe's opportunity |
|---|---|---|---|
| Xiaohongshu | Discover guides, experiences, and places | Become a general content feed | Convert travel content into an actionable route and match users around that route |
| Amap | Navigation, place search, and transport routes | Compete with professional map infrastructure | Add student preferences, budget, physical intensity, toilets, supermarkets, and accessibility constraints |
| AI assistants such as Doubao | Generate advice through conversation | Return only static text | Produce structured itineraries, dynamic reminders, matching, and a post-trip feedback loop |
| Trip.com, Fliggy, and Qunar | Hotels, tickets, and transactions | Enter complex payments and after-sales services | Estimate budgets, provide preparation reminders, and link to official channels |
| Travel-companion platforms | Find people to travel with | Focus only on finding a person | Create a shared route and rules first, then allow relationships to develop gradually |

### 3.3 Product Boundary

RouteMe is not simply “travel plus social features.” Its end-to-end loop is:

**Interests and constraints → Route generation → Route matching → Safer group formation → In-trip coordination → Travel record → Feedback improves future routes.**

---

## 4. Target Users and Personas

RouteMe should not rely on one broad “university student” persona. It should use one core persona and several scenario-based personas.

### 4.1 Core Persona: A Student Who Wants to Go but Lacks a Clear Path

- Reference age: 18–25;
- A university student or recent graduate;
- Budget-conscious;
- Interested in travel but may have limited planning experience;
- May be introverted and uncomfortable initiating conversations with strangers;
- Wants to expand their social circle through shared activities rather than pure social matching;
- Cares whether the route is realistic, affordable, and safe and whether companions are dependable.

### 4.2 Scenario Persona A: High-Intensity Challenger

- Has limited time and wants a dense, challenging experience;
- Accepts early departures, long walks, and multiple transfers;
- Needs clear information about physical intensity, equipment, supplies, and exit options;
- Example needs include weekend intercity trips, multiple attractions, and hiking challenges;
- An extreme example such as “climbing five famous mountains in three days” must be tested against travel time, physical capacity, and safety. The product must reject clearly unsafe or infeasible plans.

### 4.3 Scenario Persona B: Relaxed Explorer

- Prefers a comfortable pace and fewer transfers;
- Values food, photography, rest stops, toilets, and convenience stores;
- May plan with a friend, companion, or small group;
- Wants room for flexible changes.

### 4.4 Scenario Persona C: Spontaneous Traveler

- Suddenly has a free afternoon, day, or weekend;
- Has no exact destination or only a broad area in mind;
- Wants an actionable plan within one to three minutes;
- Cares about current location, available time, weather, return options, and opening hours.

### 4.5 Scenario Persona D: Student with Accessibility Needs

- May use a wheelchair, walking aid, or other assistive device, or may have visual, hearing, or other accessibility needs;
- Needs information about slopes, steps, elevators, accessible toilets, tactile paving, transfer distances, and assistance;
- Accessibility labels must include a source, update time, and uncertainty;
- The product should ask about concrete needs rather than placing users under a single label.

---

## 5. Three Core Travel Modes

### 5.1 High-Intensity Mode

**Goal:** Create a dense and challenging route for users with limited time.

Recommended inputs:

- Available time;
- Starting point and latest return time;
- Budget;
- Acceptable walking time or daily step target;
- Earliest departure and latest rest time;
- Transport preferences;
- Fitness level, experience, and restrictions;
- Willingness to travel at night or make multiple transfers.

Recommended outputs:

- Time-blocked itinerary;
- Total distance, steps, elevation gain, and transfers;
- Intensity rating and risk warnings;
- Water, food, toilet, and rest stops;
- Essential equipment;
- Reduced-intensity alternatives and exit plans;
- A clear “not recommended” decision when necessary.

### 5.2 Relaxed Mode

**Goal:** Build a comfortable itinerary based on individual or group preferences.

Key features:

- Combined interests such as food, history, nature, photography, exhibitions, and night views;
- Group voting;
- Toilets, supermarkets, rest areas, and medical facilities along the route;
- Limits on continuous walking and transfers;
- Rainy-day, lower-intensity, and lower-budget alternatives;
- Free time for flexible changes.

### 5.3 Spontaneous Mode

**Goal:** Help a user leave quickly when the destination and plan are unclear.

Suggested flow:

1. Use the current location or let the user choose an area manually;
2. Ask how much time and budget are available and whether the user wants to travel alone or find companions;
3. Let the user select a mood and interests, such as relaxing, photography, exercise, or food;
4. Use weather, opening hours, return time, and transport mode to create three options;
5. Let the user choose among “nearest,” “lowest cost,” and “most interesting”;
6. Allow one-tap switching to a backup route instead of restarting the planning process.

---

## 6. Core Capabilities

### 6.1 Personalized Route Generation

Route generation should consider:

- Time: duration, departure, and return deadline;
- Budget: transport, admission, meals, and contingency funds;
- Interests: nature, culture, food, photography, sports, and more;
- Intensity: steps, distance, elevation, and continuous activity time;
- Transport: walking, cycling, driving, high-speed rail, metro, bus, and air travel;
- Companions: solo, travel partner, small group, class, or student club;
- Documents: identity card, student card, Exit-Entry Permit for Travelling to and from Hong Kong and Macao, and relevant endorsements where applicable;
- Environment: weather, temperature, rain, air conditions, and sunset time;
- Special needs: accessibility, dietary restrictions, medication, and rest requirements;
- Safety: night travel, remote areas, extreme weather, and the feasibility of returning.

### 6.2 Route Matching and Group Formation

To prevent RouteMe from becoming a general dating or social app, the primary matching object should be the route, followed by the person.

Potential matching factors:

- Route or destination overlap;
- Date and time overlap;
- Travel mode;
- Budget range;
- Physical intensity and daily schedule;
- Interest tags;
- Transport preferences;
- Desired group size and atmosphere;
- Accessibility and assistance needs.

The result should explain the match, for example:

> “Your routes overlap by 82%. Both users selected Relaxed Mode, have a budget of CNY 300–500, and prefer photography and local food.”

### 6.3 Low-Pressure Social Interaction

RouteMe should not require introverted users to message strangers immediately. It should use progressive interaction:

1. Save or join the same route;
2. Answer route-related questions;
3. View public preferences and trust signals;
4. Apply to join a temporary group;
5. Use predefined icebreakers;
6. Unlock broader messaging only after mutual consent.

Possible travel-focused icebreakers:

- “Which stop are you most interested in?”
- “Do you prefer an early start or a late return?”
- “How far can you comfortably walk in one day?”
- “Which matters most: photos, food, or covering more attractions?”

### 6.4 Pre-Trip Reminders

- Identity documents, permits, and endorsements;
- Weather, umbrella, sun protection, and clothing;
- Transport and latest return time;
- Budget range and contingency funds;
- Reservations and official verification;
- Medication, power bank, water, and equipment;
- Accessibility confirmation;
- Meeting point, group rules, and emergency contacts.

### 6.5 In-Trip Assistant

- Display the next stop and estimated arrival time;
- Find nearby toilets, supermarkets, rest areas, and medical facilities;
- Replan when weather changes, delays occur, or a stop is missed;
- Provide quick adjustments such as “I am too tired,” “I am over budget,” “It is raining,” or “I want to return early”;
- Keep an offline itinerary summary and emergency information;
- Allow location sharing only when the user actively enables it, with an expiration time.

### 6.6 Post-Trip Content Loop

Users can:

- Upload photos, short videos, stories, and experience posts;
- Rate the actual route as rushed, comfortable, inaccurate, or over budget;
- Correct information about toilets, supermarkets, accessibility, and route conditions;
- Publish reusable route templates;
- Browse public content from similar routes or areas;
- Improve future route quality through real feedback.

The community should prioritize authentic route experience rather than general entertainment content.

---

## 7. First-Time User Onboarding

The first screen should not present a complex map or a long form. RouteMe should use a “60-second preference profile followed by immediate results.”

### 7.1 First-Time Flow

1. **Choose the current intention:** plan a trip, go somewhere now, or find route companions;
2. **Choose a pace:** high-intensity, relaxed, or unsure;
3. **Choose three to five interests:** food, photography, history, nature, sports, exhibitions, or night views;
4. **Enter constraints:** available time, budget, departure area, and transport;
5. **Add safety and special needs:** physical limits, dietary requirements, accessibility needs, and night-travel preferences;
6. **Set social boundaries:** solo, public routes only, open to groups, or optional group preferences;
7. **Generate three example routes**;
8. Let the user like, reject, or adjust results so the system can learn progressively.

### 7.2 Onboarding Principles

- Allow sensitive questions to be skipped;
- Explain why information is needed;
- Protect privacy by default and do not publish school, real-time location, or contact details automatically;
- Show useful results before asking users to complete a detailed profile;
- Explain why each route is recommended;
- Offer a simulated route before requiring the user to publish or join a group.

---

## 8. Safety, Privacy, and Inclusion

Social features introduce more risk than ordinary route planning. Safety must be part of the MVP.

### 8.1 Group Safety

- Student or identity verification can be an optional trust signal;
- Display verification status without exposing document numbers or images;
- Support reporting, blocking, and leaving a group;
- Recommend public meeting places for first-time groups;
- Support emergency contacts and itinerary sharing;
- Do not treat a high score as proof of safety;
- Establish clear rules against harassment, fraud, and dangerous challenges.

### 8.2 Location Privacy

- Nearby content should use an approximate area rather than precise real-time coordinates;
- Real-time sharing must be actively enabled and time-limited;
- Remind users to disable sharing after the trip;
- Do not expose dormitories, home addresses, or recurring movement patterns.

### 8.3 Accessibility

- Support screen readers, dynamic text sizes, and high contrast;
- Do not communicate important information by color alone;
- Describe steps, lifts, slopes, surfaces, and accessible toilets;
- Clearly label unverified accessibility information;
- Separate user reports from verified information.

---

## 9. Points and Reputation

Points should reward behavior that improves the travel community rather than meaningless daily check-ins.

Rewardable actions:

- Complete reviews of routes actually used;
- Verify toilets, supermarkets, or accessibility facilities;
- Submit high-quality route templates;
- Answer route questions;
- Build a record of mutually confirmed reliability after group trips;
- Submit valid safety reports.

Possible benefits:

- Personalized badges;
- Additional route templates or AI adjustments;
- Greater visibility for high-quality content;
- Access to campus route co-creation activities.

The first version should not convert points to cash or create a complex rewards marketplace.

---

## 10. Minimum Viable Product

### 10.1 MVP Hypothesis

> If university students can obtain an actionable route with minimal input and see other students with highly overlapping routes, they will be more likely to save the route, form a group, or participate in route-related discussion.

### 10.2 Must-Have Features

1. A 60-second interest and constraint profile;
2. Entry points for the three modes;
3. Three structured route options;
4. Budget, intensity, weather, document, toilet, and supermarket information;
5. Route saving and adjustment;
6. Route-based group creation and applications;
7. Basic messaging, reporting, blocking, and group exit;
8. Post-trip ratings and photo-and-text sharing.

### 10.3 Out of Scope for the MVP

- Ticket, hotel, or admission transactions;
- A full short-video community;
- Precise real-time “people nearby” functionality;
- A complex points marketplace;
- All age groups and all travel categories;
- Automatic guarantees that documents are valid;
- Replacing human safety review with AI.

---

## 11. Key User Journey

### Scenario: A first-time user plans a one-day weekend trip around Zhuhai

1. The user opens the app and selects “Go somewhere now”;
2. The user enters Saturday 09:00–20:00 and a CNY 300 budget;
3. The user selects photography, food, and the seaside, with bus and walking as transport modes;
4. The user chooses Relaxed Mode and limits continuous walking to 40 minutes;
5. RouteMe generates three routes emphasizing the nearest option, the lowest-cost option, and the best photography option;
6. The user checks weather, toilets, supermarkets, return options, and budget guidance;
7. The user saves one route and chooses “See who is taking a similar route”;
8. RouteMe displays groups with route and time overlap rather than strangers' precise locations;
9. The user reviews the match explanation and group rules before applying;
10. If it rains, RouteMe suggests indoor alternatives;
11. After the trip, the user rates the intensity and uploads photos;
12. The feedback becomes evidence for future route recommendations.

---

## 12. Recommended Roadmap

### Phase 1: Problem Validation, 1–2 Weeks

- Interview 15–20 university students;
- Include solo travelers, group travelers, introverted users, high-intensity travelers, and users with accessibility needs;
- Validate whether users genuinely want companions, what they fear, what information they will share, and whether route generation is valuable;
- Ask about real recent trips rather than only asking whether they would use the app.

Suggested interview questions:

- Tell us about the last time you wanted to go somewhere but did not go. What stopped you?
- How long did your last travel plan take, and what was the hardest part?
- Under what conditions would you travel with an unfamiliar student?
- What information would you share, and what would you never share?
- If the first version could build either better routes or better companion matching, which would matter more?
- At which point in a trip are problems most likely to occur?

### Phase 2: Prototype Validation, 1–2 Weeks

Build a clickable prototype with five key screens:

1. First-time preference setup;
2. Mode selection;
3. Route results;
4. Route matching and group formation;
5. In-trip adjustment and post-trip sharing.

Ask five to eight target users to complete realistic tasks and observe whether they can generate and understand a route within three minutes.

### Phase 3: MVP Development, 4–8 Weeks

Prioritize:

- User preferences and constraints;
- Structured route generation;
- Route saving and editing;
- Group applications and basic safety controls;
- Photo-and-text feedback.

### Phase 4: Small Campus Pilot, 2–4 Weeks

- Start with one campus or one city;
- Curate 10–20 common weekend routes;
- Recruit seed users through student clubs, classes, or campus activities;
- Manually review early public routes and group posts;
- Avoid nationwide coverage at launch because route quality and safety moderation will be difficult to control.

---

## 13. Success Metrics

### North-Star Metric

**Effective departure rate:** the percentage of users who generate a route and later confirm use, complete a check-in, or submit post-trip feedback within the intended time window.

### Supporting Metrics

- Time required to generate the first route;
- Route save rate;
- Route adjustment rate;
- Group application and acceptance rates;
- Conversion from route match to successful group formation;
- Post-trip feedback rate;
- Correction rate for toilets, supermarkets, and accessibility information;
- Reports, blocks, and severe safety incidents;
- Seven-day and 30-day retention.

Registration and posting volume alone should not define success. RouteMe creates value when it helps a user complete a more suitable and safer real-world journey.

---

## 14. Decisions Required Now

1. **Primary scenario:** Start with local one-day trips or weekend intercity trips? Recommendation: local one-day trips.
2. **Primary user:** All university students or students who want to travel but lack companions? Recommendation: prioritize the second group.
3. **Value priority:** Route quality first, matching second, content community third.
4. **Matching model:** Match routes and groups before matching strangers directly.
5. **Geographic scope:** Validate within one campus or one city.
6. **Safety threshold:** Reporting, blocking, exit, privacy, and location controls must be included in the MVP.
7. **Accessibility promise:** Only display specific conditions with sources and update times. Do not use a vague “suitable for disabled people” label.

---

## 15. Final Product Intent Statement

RouteMe aims to ensure that university students do not abandon a travel idea simply because they cannot plan it, lack companions, or feel uncomfortable initiating social contact. It begins with a personalized route and connects users through a shared travel objective. Progressive interaction, clear safety boundaries, preparation reminders, in-trip adjustments, and post-trip sharing create a complete loop from intention to departure and from departure to reusable experience.

RouteMe does not aim to become a booking platform, professional map provider, or general content network. Its value is helping each student make a more suitable travel decision and meet potential companions in a more natural and controllable way through a shared route.
