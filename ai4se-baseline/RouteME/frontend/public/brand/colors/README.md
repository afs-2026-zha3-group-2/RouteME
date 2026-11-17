# RouteMe 路觅 — colourways

Six complete colourways of the same mark and lockup. The shape never changes: only
the badge gradient, the accent, and the wordmark colours. Compare them all in
`palettes.png` (row 1 = primary mark, row 2 = the shared-route community mark).

Files per colourway: `palette-<name>-mark.png` (1024×1024, transparent corners) and
`palette-<name>-lockup.png` (mark + wordmark).

Use as `/brand/colors/palette-lagoon-mark.png` in the frontend.

---

## 1 · Lagoon — the default

| Role | Hex |
| --- | --- |
| Gradient | `#14B8A6` → `#0E98C0` → `#2563EB` |
| Accent | `#FF6F5E` coral |
| "Me" | `#12A899` |
| 路觅 | `#0E8A80` |

Cool, calm, trustworthy; reads as water, map and clarity. The safest default and the
one already wired into the primary kit in `../`. **Use for:** the main product brand.

## 2 · Sunset — warm, human, social

| Role | Hex |
| --- | --- |
| Gradient | `#FB923C` → `#F97316` → `#BE185D` |
| Accent | `#312E81` deep indigo |
| "Me" | `#E11D48` rose |
| 路觅 | `#9A3412` burnt umber |

Golden hour, departure, warmth between people. The indigo accent is the surprise
here — a cool note against all that orange so the dots still pop. **Use for:**
campaigns, summer/seasonal promos, community storytelling.

## 3 · Violet — creative, young, nightlife

| Role | Hex |
| --- | --- |
| Gradient | `#818CF8` → `#8B5CF6` → `#D946EF` |
| Accent | `#FACC15` yellow |
| "Me" | `#9333EA` violet |
| 路觅 | `#6D28D9` deep violet |

Playful and a bit electric; the yellow accent is the loudest of the six. **Use for:**
student/campus marketing, events, social features, anything aimed at a younger crowd.

## 4 · Forest — outdoors, sustainable, grounded

| Role | Hex |
| --- | --- |
| Gradient | `#34D399` → `#10B981` → `#047857` |
| Accent | `#FFB020` amber |
| "Me" | `#059669` emerald |
| 路觅 | `#065F46` deep green |

Hiking, nature routes, slow travel. The amber accent reads as sunlight or a trail
marker. **Use for:** outdoor and eco-travel content, or a more premium, restrained
tone.

## 5 · Desert — adventure, road trips, warmth

| Role | Hex |
| --- | --- |
| Gradient | `#FBBF24` → `#EA580C` → `#9F1239` |
| Accent | `#0D9488` teal |
| "Me" | `#C2410C` rust |
| 路觅 | `#7C2D12` dark umber |

Sand, canyon, late-afternoon heat. The teal accent deliberately cuts against the
warm badge — it is the complementary move, and it keeps the dots legible on yellow.
**Use for:** road trips, long-haul and adventure themes.

## 6 · Midnight — dark mode, premium, global

| Role | Hex |
| --- | --- |
| Gradient | `#2563EB` → `#312E81` → `#0F172A` |
| Accent | `#34D399` mint |
| "Me" | `#2563EB` azure |
| 路觅 | `#1E3A8A` navy |

The only dark badge: blue into near-black, with mint accents. Sits naturally on a
dark UI without looking like a cut-out. **Use for:** dark theme, splash/login,
premium or night-time positioning.

---

## Rules that hold across all six

- Keep the badge geometry and the white ink identical; only swap the three gradient
  stops, the accent, and the two wordmark colours.
- The accent must stay clearly distinct from the gradient's mid-tone. When the badge
  gets warm or dark (Sunset, Desert, Midnight) the accent moves to the opposite side
  of the wheel — indigo, teal, mint.
- "Me" always takes a saturated mid-tone of the new palette; 路觅 always takes the
  darkest, least saturated version so the two lines stay related but not identical.
- Don't mix a badge from one colourway with a wordmark from another.

If the product needs a single default plus a dark-mode pair, take **Lagoon** and
**Midnight**; they are built to sit side by side.