# Regenerating the card

`../assets/card.svg` is generated, not hand-edited.

```powershell
# 1. resample avatar.jpg into grids of hex colours
powershell -File tools/sample-avatar.ps1     # -> pixels2.txt      (40x50, pixel portrait)
powershell -File tools/sample-face60.ps1     # -> pixels-face60.txt (60x80, ASCII portrait)

# 2. build the card
node tools/generate-card.js assets/card.svg pixel     # shipped version
node tools/generate-card.js /tmp/alt.svg     ascii    # ASCII-character portrait
```

The samplers use .NET `System.Drawing`, so they need Windows. No Python or image
libraries required. Crop windows are the `$CX/$CY/$CW/$CH` values at the top of
each script; they exclude the white watermark on the right of the avatar.

## Layout

`generate-card.js` holds the panel content in `FIELDS`, `CONTACT` and `STATS`.
Every panel line is padded to a fixed **character** count (`COLS = 76`) and
emitted as a single `<text>`, so the dotted leaders and right-aligned values line
up in whatever monospace font the viewer happens to have. Change `COLS` and the
whole panel re-flows.

Colours are the `.hd/.ru/.dt/.lb/.do/.vl` rules in the inline `<style>`.

## Portrait modes

`pixel` maps luminance onto the green ramp in `RAMP` and draws one `<rect>` per
cell. This is the shipped mode: at 40x50 cells the face is clearly recognizable.

`ascii` (in `ascii.js`) maps to characters instead. Two things matter there:

- The mapping is **inverted** — dark features become dense glyphs and lit skin
  stays sparse, which is what makes character art read as a face at all.
- Because of that inversion, dark *background* would go dense too, so the
  silhouette is derived per row from the detected skin span rather than from a
  guessed ellipse. There are dark trees behind his left shoulder that no colour
  rule alone separates.

`ascii.js` also supports a local-contrast mode (`detailK` > 0) that inks pixels
darker than their neighbourhood. It draws sharper edges but, on this photo's flat
outdoor lighting, reads as noise. Left in place, off by default (`detailK: 0`).
