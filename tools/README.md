# Regenerating the card

`../assets/card.svg` is generated, not hand-edited.

```powershell
# 1. crop the hand-made portrait and export the embeddable copy
powershell -ExecutionPolicy Bypass -File tools/crop-art.ps1 -OutW 600 -Quality 92

# 2. build the card
node tools/generate-card.js assets/card.svg image     # shipped version
```

Windows only: the scripts use .NET `System.Drawing`, so no Python or image
libraries are required. Note the `-ExecutionPolicy Bypass` — scripts are
disabled by default on this machine.

## Layout

`generate-card.js` holds the panel content in `FIELDS`, `CONTACT` and `STATS`,
and the per-mode geometry in `LAYOUT`. Every panel line is padded to a fixed
**character** count (`cols`) and emitted as a single `<text>`, so the dotted
leaders and right-aligned values line up in whatever monospace font the viewer
happens to have. Change `cols` and the whole panel re-flows — check the longest
values still fit before you shrink it.

Colours are the `.hd/.ru/.dt/.lb/.do/.vl` rules in the inline `<style>`.

## Portrait modes

`image` is the shipped mode: `art.png` is the hand-made ASCII/binary portrait,
`crop-art.ps1` trims its black margins to a 1154x1190 content box and writes
`art-crop.jpg`, and the generator inlines that as a base64 `<image>`.

Two details matter there:

- The image is used as its own **luminance mask**, so the art's black
  background drops out instead of painting a dark rectangle over the card. The
  visible ink is a separate green gradient (`#ink`) showing through the mask.
- Because the mask is luminance-based, near-black JPEG noise would haze the
  whole rectangle. The `crush` filter (`feComponentTransfer`, slope 1.6,
  intercept -0.15) pulls that to zero. If you re-export the crop at a lower
  quality you will need a harder crush, or a faint box edge reappears around
  the portrait.

The other two modes generate a portrait from `avatar.jpg` instead and are kept
for reference. They need their samplers run first:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sample-avatar.ps1   # -> pixels2.txt       (40x50, pixel)
powershell -ExecutionPolicy Bypass -File tools/sample-face60.ps1   # -> pixels-face60.txt (60x80, ascii)
node tools/generate-card.js /tmp/alt.svg pixel
node tools/generate-card.js /tmp/alt.svg ascii
```

Their crop windows are the `$CX/$CY/$CW/$CH` values at the top of each script;
they exclude the white watermark on the right of the avatar.

`pixel` maps luminance onto the green ramp in `RAMP` and draws one `<rect>` per
cell. `ascii` (in `ascii.js`) maps to characters instead, with two quirks:

- The mapping is **inverted** — dark features become dense glyphs and lit skin
  stays sparse, which is what makes character art read as a face at all.
- Because of that inversion, dark *background* would go dense too, so the
  silhouette is derived per row from the detected skin span rather than from a
  guessed ellipse. There are dark trees behind his left shoulder that no colour
  rule alone separates.

`ascii.js` also supports a local-contrast mode (`detailK` > 0) that inks pixels
darker than their neighbourhood. It draws sharper edges but, on that photo's
flat outdoor lighting, reads as noise. Left in place, off by default.
