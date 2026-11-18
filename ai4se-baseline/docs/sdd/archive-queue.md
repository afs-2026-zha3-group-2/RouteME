# Archive queue (generated)

Generated: 2026-11-18 by `scripts/archive-queue.mjs`. Do not hand-edit; re-run to refresh.
Archiving stays human-approved (default: do NOT auto-archive). Execute ready changes via
`openspec-archive-change` / `openspec-bulk-archive-change` in the topological order below.

## Can archive now (16)

- add-admin-dashboard
- add-ai-itinerary
- add-credit-exit-restriction
- add-match-reason
- add-route-completion
- add-travel-finance
- add-trip-publish
- add-trip-weather
- add-user-logout
- refine-detail-companions
- refine-experience-share
- refine-inspiration-home
- refine-my-trips
- refine-trip-application
- refine-trip-chat
- refine-trip-map

## Topological order (dependencies first)

1. add-admin-console
2. add-admin-dashboard
3. add-admin-experience-moderation
4. add-ai-itinerary
5. add-credit-account
6. add-credit-exit-restriction
7. add-credit-recovery
8. add-growth-level
9. add-match-reason
10. add-realtime-notifications
11. add-report-credit-deduction
12. add-route-completion
13. add-travel-finance
14. add-traveler-recommendation
15. add-trip-cancel
16. add-trip-completion
17. add-trip-publish
18. add-trip-weather
19. add-user-auth
20. add-user-logout
21. add-user-profile
22. add-user-profiles
23. refine-detail-companions
24. refine-experience-share
25. refine-inspiration-home
26. refine-my-trips
27. refine-safety-report
28. refine-service-close
29. refine-service-inbox-unread
30. refine-service-workbench-live
31. refine-trip-application
32. refine-trip-chat
33. refine-trip-map
34. refine-user-support-entry
35. remove-home-greeting-note
36. add-destination-area-filters
37. add-experience-photos
38. refine-publish-route-map
39. add-experience-like-credit

## Per-change status

| change | archive after | source | G2 | blockers |
|---|---|---|---|---|
| add-admin-console | — | — | missing | G2=missing |
| add-admin-dashboard | — | — | Pass | READY |
| add-admin-experience-moderation | add-admin-console | docs/sdd/README.md index note | missing | G2=missing; after add-admin-console |
| add-ai-itinerary | — | — | Pass | READY |
| add-credit-account | — | — | missing | G2=missing |
| add-credit-exit-restriction | — | — | Pass with documented debt | READY |
| add-credit-recovery | add-credit-account | docs/sdd/README.md index note | missing | G2=missing; after add-credit-account |
| add-destination-area-filters | refine-inspiration-home | docs/sdd/README.md index note | Conditional | G2=Conditional; after refine-inspiration-home |
| add-experience-like-credit | add-credit-account, add-experience-photos | docs/sdd/README.md index note | missing | G2=missing; after add-credit-account; after add-experience-photos |
| add-experience-photos | refine-experience-share | docs/sdd/README.md index note | missing | G2=missing; after refine-experience-share |
| add-growth-level | — | — | missing | G2=missing |
| add-match-reason | — | — | Pass | READY |
| add-realtime-notifications | — | — | missing | G2=missing |
| add-report-credit-deduction | add-admin-console, add-credit-account | docs/sdd/README.md index note | missing | G2=missing; after add-admin-console; after add-credit-account |
| add-route-completion | — | — | Pass | READY |
| add-travel-finance | — | — | Pass with documented debt | READY |
| add-traveler-recommendation | — | — | missing | G2=missing |
| add-trip-cancel | — | — | missing | G2=missing |
| add-trip-completion | — | — | missing | G2=missing |
| add-trip-publish | — | — | Pass | READY |
| add-trip-weather | — | — | Pass | READY |
| add-user-auth | — | — | Pending | G2=Pending |
| add-user-logout | — | — | Pass | READY |
| add-user-profile | — | — | Pending | G2=Pending |
| add-user-profiles | — | — | missing | G2=missing |
| refine-detail-companions | — | — | Pass | READY |
| refine-experience-share | — | — | Pass | READY |
| refine-inspiration-home | — | — | Pass | READY |
| refine-my-trips | — | — | Pass | READY |
| refine-publish-route-map | refine-trip-map, add-trip-publish | docs/sdd/README.md index note | missing | G2=missing; after refine-trip-map; after add-trip-publish |
| refine-safety-report | — | — | missing | G2=missing |
| refine-service-close | add-admin-console | docs/sdd/README.md index note | Pass | after add-admin-console |
| refine-service-inbox-unread | add-admin-console | docs/sdd/README.md index note | missing | G2=missing; after add-admin-console |
| refine-service-workbench-live | add-admin-console | docs/sdd/README.md index note | missing | G2=missing; after add-admin-console |
| refine-trip-application | — | — | Pass | READY |
| refine-trip-chat | — | — | Pass | READY |
| refine-trip-map | — | — | Pass | READY |
| refine-user-support-entry | add-admin-console | docs/sdd/README.md index note | missing | G2=missing; after add-admin-console |
| remove-home-greeting-note | — | — | missing | G2=missing |
