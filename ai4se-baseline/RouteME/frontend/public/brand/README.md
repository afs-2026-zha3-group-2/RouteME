# RouteMe 路觅 — brand assets

Logo for **RouteMe 路觅**, a travel-based social platform where people publish travel
plans, find others heading to the same place at the same time, and share real trips
with the community.

## Files

| File | Size | Use |
| --- | --- | --- |
| `routeme-mark-1024.png` | 1024×1024 | App icon / social avatar (transparent corners) |
| `routeme-mark-512.png` | 512×512 | PWA icon, favicon source |
| `routeme-logo-horizontal.png` | 1268×468 | Primary lockup on light backgrounds (README, slides, nav bar) |
| `routeme-logo-horizontal-white.png` | 1268×468 | Same lockup for dark/photographic backgrounds |
| `routeme-logo-stacked.png` | 945×750 | Square-ish placements: splash screen, poster, login page |

All files are PNG with transparency. Suggested use in the frontend: put them in
`public/brand/` and reference as `/brand/routeme-logo-horizontal.png`.

## Palette

| Name | Hex | Role |
| --- | --- | --- |
| Teal | `#14B8A6` | Gradient start, "Me" in the wordmark |
| Lagoon | `#0E98C0` | Gradient middle |
| Azure | `#2563EB` | Gradient end |
| Night | `#0B2440` | Primary text / wordmark |
| Coral | `#FF6F5E` | Accent: traveller dot, pin centre |
| Deep teal | `#0E8A80` | Chinese wordmark 路觅 |

Badge gradient runs diagonally (≈135°): `#14B8A6 → #0E98C0 → #2563EB`.

## The idea

- **S-curved route** — a journey, and a travel plan being laid down.
- **Location pin** — the destination someone publishes.
- **Coral dot** — *you* at the start of the route; the same dot sits inside the pin,
  so "me" and "the place" are visibly connected. That is the product in one shape:
  a route from you to a destination, open to others travelling the same way.
- The route narrows as it reaches the pin, so the path flows into the destination
  instead of hitting it.

## Usage notes

- Minimum size: mark **24 px**, horizontal lockup **160 px** wide.
- Clear space: keep at least the height of the pin head (≈ 1/5 of the icon) free on all sides.
- Keep the mark upright; don't stretch, outline, add shadows, or swap the gradient.
- On dark backgrounds use the `-white` lockup; the badge gradient stays as is.
- Wordmark is set in a bold geometric sans (Noto Sans HK Bold for Latin,
  Microsoft YaHei Bold for 路觅). For a vector version, the mark and wordmark can be
  re-cut as SVG on request.

## Variants

| Folder | What's in it |
| --- | --- |
| [`concepts/`](concepts/) | Four alternative marks: two paths to one place, R monogram, pin + conversation, globe |
| [`colors/`](colors/) | The same logo in six colourways (Lagoon, Sunset, Violet, Forest, Desert, Midnight), each as mark + lockup |
| [`community/`](community/) | Three community-led marks: shared route, circle of people, team route |

Start with `colors/palettes.png` for the colourways and `community/community.png` for
the community marks.