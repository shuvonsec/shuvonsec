# Regenerating the hero card

`../assets/hero.svg` is generated, not hand-edited. Two steps:

```powershell
# 1. resample avatar.jpg into a 40x50 grid of hex colours -> pixels2.txt
powershell -File tools/sample-avatar.ps1

# 2. build the SVG from that grid
node tools/generate-hero.js assets/hero.svg
```

`sample-avatar.ps1` uses .NET `System.Drawing`, so it needs Windows (no Python
or image libraries required). The crop window at the top of the script
(`$CX/$CY/$CW/$CH`) excludes the white watermark on the right of the avatar.

`generate-hero.js` masks the leafy background by hue, drops bright neutral
watermark pixels, applies a separable falloff so the torso dissolves into the
terminal, then maps luminance onto the matrix ramp in `RAMP`. Text content for
the neofetch panel is the `FIELDS` array.

`../assets/divider.svg` is hand-written. The binary reads `HUNT the bug`.
