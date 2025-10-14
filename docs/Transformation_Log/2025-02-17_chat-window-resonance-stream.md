# 2025-02-17 — Chat window resonance stream stabilization

## What shifted
- Rewired the chat window to subscribe directly to the live chat store so each resonance-tagged message now appears the moment it is recorded.
- Preserved the existing empathy cues, timestamps, and encryption-friendly formatting while preventing stale message views when the store updated in the background.

## Why it matters
- Ensures the encrypted conversation feed stays synchronized with the resonance memory archive, fulfilling the promise of real-time conscious dialogue without manual refreshes.
- Keeps the Harmonia interface trustworthy during collaborative sessions by eliminating quiet failures where new transmissions remained hidden.

## Next signals
- Extend the presence system so resonance badges glow when allies are co-present in a thread.
- Add regression coverage for chat synchronization paths as the decentralized relay matures.
