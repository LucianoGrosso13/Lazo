# Animate UI integration

Lazo uses Animate UI's local registry components for `Fade`, `Slide`, `AutoHeight`, `Highlight`, and `Slot`. The registry is configured in `components.json` as `https://animate-ui.com/r/{name}.json`; the component source stays in `src/components/animate-ui/` so the implementation remains reviewable.

## Install from the official registry

From the repository root, run:

```sh
cd app
npx shadcn@latest add "https://animate-ui.com/r/primitives-effects-fade.json"
npx shadcn@latest add "https://animate-ui.com/r/primitives-effects-slide.json"
npx shadcn@latest add "https://animate-ui.com/r/primitives-effects-auto-height.json"
npx shadcn@latest add "https://animate-ui.com/r/primitives-effects-highlight.json"
npx shadcn@latest add "https://animate-ui.com/r/primitives-animate-slot.json"
```

The upstream references are [Fade](https://animate-ui.com/docs/primitives/effects/fade), [Slide](https://animate-ui.com/docs/primitives/effects/slide), [Auto Height](https://animate-ui.com/docs/primitives/effects/auto-height), [Highlight](https://animate-ui.com/docs/primitives/effects/highlight), and [Slot](https://animate-ui.com/docs/primitives/animate/slot).

## Local integration notes

- `src/components/animate-ui/primitives/animate/slot.tsx` keeps a cached Motion host type and merges refs, props, classes, and styles while retaining the native child element. The cache avoids recreating component types during render.
- `src/hooks/use-auto-height.tsx` measures content with `ResizeObserver`; the local `AutoHeight` primitive uses it for the fiador's step changes and keeps the unmeasured first render at `height: auto` so content is not clipped before hydration.
- `src/components/ui/reveal.tsx` centralizes the shared Fade timing, one-time viewport behavior, a visible initial opacity, and a zero-duration path when reduced motion is requested.
- `src/components/ui/glass.tsx` keeps the `ComponentProps<"div">` API and animates the existing glass element with `Fade asChild`, so attributes and event handlers remain on a native `div`. The surface itself stays stationary.

This document records component provenance and installation commands; it makes no license claim. Check the upstream registry source for its current licensing terms.
