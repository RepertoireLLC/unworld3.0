# Rectificano Visual Plugin

The Rectificano visual system expresses Harmonia's resonance principle by reading the collective emotional field and rendering adaptive aura and ripple layers with Three.js shaders.

## Directory Layout

```
harmonia_core/
  state/
    emotional_field.json               # Live emotional field snapshot
    backups/
      emotional_field_20241014T144500Z.json
  visual_systems/
    rectificano_visuals/
      RectificanoVisualPlugin.ts       # Entry point for the renderer
      types.ts                         # Shared type definitions
      utils/
        EmotionalFieldReader.ts        # Cross-runtime loader with caching
      shaders/
        commonVertex.ts                # Instanced vertex shader shared by all effects
        auraFragment.ts                # Aura fragment shader
        rippleFragment.ts              # Ripple fragment shader
      backups/
        emotional_field_20241014T144500Z.json
      CHANGELOG.md
      docs/
        README.md (this file)
```

## Usage

```
import { Scene, PerspectiveCamera, WebGLRenderer } from "three";
import { RectificanoVisualPlugin } from "harmonia_core/visual_systems/rectificano_visuals/RectificanoVisualPlugin";

const scene = new Scene();
const plugin = new RectificanoVisualPlugin({
  scene,
  autoRefreshMs: 5000,
  rippleSpeedMultiplier: 1.25,
});

await plugin.initialize();

function animate() {
  requestAnimationFrame(animate);
  plugin.update();
  renderer.render(scene, camera);
}

animate();
```

### Options

- `scene`: existing Three.js scene instance. If omitted, provide one to `initialize(scene)`.
- `globalScale`: scales aura/ripple extents uniformly.
- `rippleSpeedMultiplier`: accelerates or slows ripple propagation without altering aura motion.
- `autoRefreshMs`: optional interval for reloading the emotional field and reapplying resonance.
- `sourcePath` / `fetcher`: forwarded to the `EmotionalFieldReader` for custom data retrieval.

## Emotional Field Schema

Each entry in `emotional_field.json` should include:

```
{
  "id": "serenity-halo",
  "coordinates": [x, y, z],
  "intensity": 0.0 - 1.0,
  "tone": "string",
  "frequencyHz": 432,
  "coherence": 0.0 - 1.0,
  "rhythm": { "bpm": number, "variability": number },
  "color": "#RRGGBB"
}
```

Global metadata:

```
{
  "updatedAt": "ISO8601",
  "globalPulse": { "bpm": number, "waveform": "sine", "variance": 0.18 },
  "nodes": [ ... ]
}
```

## Backups

Fresh emotional field snapshots are copied into both `harmonia_core/state/backups/` and `harmonia_core/visual_systems/rectificano_visuals/backups/` to maintain recovery points that align with the changelog entry.

## Performance Notes

- Instanced meshes are used for both aura and ripple layers to keep GPU draw calls minimal.
- Shaders lean on simple sinusoidal math to reflect emotional rhythm while avoiding expensive texture lookups.
- Uniform updates are restricted to per-frame time and beat calculations, ensuring compatibility with existing render loops.
