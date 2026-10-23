# Branding background cleanup

User-approved device-audit fixes, prepared with the built-in image generation tool in background-extraction edit mode. The original uploaded JPEGs remain byte-for-byte intact.

Project outputs:
- `app/src/main/res/drawable-nodpi/podium_air_ui_mono.png`: transparent Chrome cutout.
- `app/src/main/res/drawable-nodpi/podium_air_icon.png`: same cutout for Android Replay.
- `sharedUi/src/commonMain/composeResources/drawable/podium_chrome.png`: same cutout for Android shared UI and onboarding.
- `app/src/main/res/drawable-nodpi/podium_liquid_glass_trimmed.png`: transparent exterior around the red Liquid Glass tile.

Chrome extraction prompt: Remove only the surrounding black square and the background between projecting silver ribbon shapes. Preserve the existing silver P, black vinyl disc, grooves, proportions, reflections and colors. Keep the disc opaque; use real alpha outside the connected logo, minimal padding, no new border, shadow, text or redesign.

Final Chrome cleanup prompt: Clean alpha edges only. Keep the main silver P/vinyl/ribbon design and placement. Remove disconnected white speckles/fringe above and between tails. Keep the black vinyl disc opaque and all exterior pixels transparent. No recoloring or added artwork.

Liquid Glass prompt: Extract the existing red rounded-square glass tile. Preserve the P, black vinyl and reflections. Remove only the exterior black canvas, leaving about 2 percent alpha padding. No surrounding black border, drop shadow, new art or redesign.

Original uses the untouched red uploaded JPEG through its own adaptive drawable. Adaptive masks and red backing handle launcher geometry; launcher resources do not refer to the shared Chrome UI image. Settings previews use their corresponding assets.

## Launcher alignment correction (branding4)

All three launchers now use the canonical 1536×1536 uploaded canvases with the
production Original's four 9dp insets. Original uses the exact production image
bytes and adaptive background/monochrome configuration. Chrome has an adaptive
resource so Android no longer applies legacy-icon padding. Liquid Glass uses its
canonical canvas at the same scale rather than applying an unrelated inset to
the tightly cropped UI cutout. Red adaptive backing remains behind Glass.
Transparent cutouts continue to be used for in-app marks and Glass settings
previews. No artwork was regenerated for this alignment change.
