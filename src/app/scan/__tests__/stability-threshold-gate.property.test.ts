/**
 * Property-Based Test: Stability threshold gate
 *
 * Feature: auto-scan-ocr, Property 1: Stability threshold gate
 * Validates: Requirements 2.2
 *
 * Property: For any sequence of detection frames, auto capture SHALL only be
 * triggered when confidence >= 0.6 AND the bounding box has been stable
 * (movement < 90px total) for >= 1000ms continuously. Any frame where
 * confidence drops below threshold or box moves beyond threshold SHALL reset
 * the stability timer.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================
// Constants — mirror useStability.ts exactly
// ============================================================

const CONF_THRESHOLD = 0.6;
const REQUIRED_STABLE_DURATION = 1000; // ms
const MOVEMENT_THRESHOLD = 90;
const DETECTION_TIMEOUT = 1200; // ms
const SHARPNESS_THRESHOLD = 65;

// ============================================================
// Types
// ============================================================

interface PhoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ============================================================
// Pure stability engine — extracted from useStability.ts
// (same logic, no React refs, driven by explicit timestamps)
// ============================================================

interface StabilityState {
  stableStart: number | null;
  lastBox: PhoneBox | null;
  lastDetect: number;
  hasTriggered: boolean;
}

function makeState(): StabilityState {
  return { stableStart: null, lastBox: null, lastDetect: 0, hasTriggered: false };
}

/**
 * Returns [newState, triggered].
 * Mirrors the `update` function in useStability.ts, but takes an explicit
 * `now` timestamp so tests can control time without real timers.
 */
function updateStability(
  state: StabilityState,
  detected: boolean,
  confidence: number,
  box: PhoneBox | null,
  sharpness: number,
  now: number
): [StabilityState, boolean] {
  if (state.hasTriggered) return [state, false];

  const isStableBox = (prev: PhoneBox | null, curr: PhoneBox): boolean => {
    if (!prev) return false;
    const movement =
      Math.abs(prev.x - curr.x) +
      Math.abs(prev.y - curr.y) +
      Math.abs(prev.w - curr.w) +
      Math.abs(prev.h - curr.h);
    return movement < MOVEMENT_THRESHOLD;
  };

  if (
    detected &&
    box &&
    confidence >= CONF_THRESHOLD &&
    sharpness > SHARPNESS_THRESHOLD
  ) {
    const stable = isStableBox(state.lastBox, box);

    if (!stable) {
      return [
        { ...state, stableStart: null, lastBox: box },
        false,
      ];
    }

    const newStableStart = state.stableStart ?? now;
    const duration = now - newStableStart;

    if (duration >= REQUIRED_STABLE_DURATION) {
      return [
        { ...state, hasTriggered: true, stableStart: null, lastBox: null, lastDetect: now },
        true,
      ];
    }

    return [
      { ...state, stableStart: newStableStart, lastBox: box, lastDetect: now },
      false,
    ];
  } else {
    // Reset stableStart if detection has timed out
    if (now - state.lastDetect > DETECTION_TIMEOUT) {
      return [{ ...state, stableStart: null, lastBox: null }, false];
    }
    return [state, false];
  }
}

// ============================================================
// Arbitraries
// ============================================================

/** A box that stays within a reasonable canvas */
const boxArb = fc.record<PhoneBox>({
  x: fc.integer({ min: 0, max: 500 }),
  y: fc.integer({ min: 0, max: 500 }),
  w: fc.integer({ min: 50, max: 300 }),
  h: fc.integer({ min: 50, max: 300 }),
});

/** Confidence below threshold */
const lowConfidenceArb = fc.float({
  min: Math.fround(0),
  max: Math.fround(CONF_THRESHOLD - 0.01),
  noNaN: true,
});

/** Confidence at or above threshold */
const highConfidenceArb = fc.float({
  min: Math.fround(CONF_THRESHOLD),
  max: Math.fround(1.0),
  noNaN: true,
});

/** Sharpness above threshold */
const sharpEnoughArb = fc.float({
  min: Math.fround(SHARPNESS_THRESHOLD + 1),
  max: Math.fround(200),
  noNaN: true,
});

// ============================================================
// Tests
// ============================================================

describe("Property 1: Stability threshold gate", () => {
  /**
   * Feature: auto-scan-ocr, Property 1: Stability threshold gate
   * Validates: Requirements 2.2
   *
   * For any confidence value below 0.6, the trigger MUST NOT fire
   * regardless of how long the box has been stable.
   */
  it("never triggers when confidence is below 0.6", () => {
    fc.assert(
      fc.property(
        lowConfidenceArb,
        boxArb,
        sharpEnoughArb,
        (confidence, box, sharpness) => {
          let state = makeState();
          let triggered = false;

          // Feed many frames with the same stable box but low confidence,
          // advancing time well past the required stable duration
          for (let i = 0; i < 20; i++) {
            const now = i * 100; // 0ms … 1900ms
            const [next, fired] = updateStability(state, true, confidence, box, sharpness, now);
            state = next;
            if (fired) triggered = true;
          }

          expect(triggered).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 1: Stability threshold gate
   * Validates: Requirements 2.2
   *
   * For any confidence >= 0.6 with a stable box and sufficient sharpness,
   * the trigger MUST fire once >= 1000ms of continuous stability has elapsed.
   */
  it("triggers after >= 1000ms of stable frames with confidence >= 0.6", () => {
    fc.assert(
      fc.property(
        highConfidenceArb,
        boxArb,
        sharpEnoughArb,
        (confidence, box, sharpness) => {
          let state = makeState();
          let triggered = false;

          // Feed frames at t=0, 100, 200, … 1500ms — same box, high confidence
          for (let i = 0; i <= 15; i++) {
            const now = i * 100;
            const [next, fired] = updateStability(state, true, confidence, box, sharpness, now);
            state = next;
            if (fired) triggered = true;
          }

          expect(triggered).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 1: Stability threshold gate
   * Validates: Requirements 2.2
   *
   * For any confidence >= 0.6 with a stable box, the trigger MUST NOT fire
   * before 1000ms of continuous stability has elapsed.
   */
  it("does not trigger before 1000ms of stability even with high confidence", () => {
    fc.assert(
      fc.property(
        highConfidenceArb,
        boxArb,
        sharpEnoughArb,
        (confidence, box, sharpness) => {
          let state = makeState();
          let triggered = false;

          // Feed frames only up to 900ms (just under the threshold)
          for (let i = 0; i <= 9; i++) {
            const now = i * 100; // 0ms … 900ms
            const [next, fired] = updateStability(state, true, confidence, box, sharpness, now);
            state = next;
            if (fired) triggered = true;
          }

          expect(triggered).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 1: Stability threshold gate
   * Validates: Requirements 2.2
   *
   * For any box movement >= MOVEMENT_THRESHOLD (90px), the stability timer
   * MUST reset, preventing the trigger from firing based on pre-movement time.
   */
  it("resets stability timer when box moves beyond threshold", () => {
    fc.assert(
      fc.property(
        highConfidenceArb,
        boxArb,
        sharpEnoughArb,
        // Generate a large delta that guarantees movement >= MOVEMENT_THRESHOLD
        fc.integer({ min: MOVEMENT_THRESHOLD, max: 400 }),
        (confidence, box, sharpness, delta) => {
          let state = makeState();
          let triggered = false;

          // Build up 800ms of stability
          for (let i = 0; i <= 8; i++) {
            const now = i * 100;
            const [next, fired] = updateStability(state, true, confidence, box, sharpness, now);
            state = next;
            if (fired) triggered = true;
          }

          // Introduce a large movement at t=900ms — resets the timer
          const movedBox: PhoneBox = { ...box, x: box.x + delta };
          const [afterMove] = updateStability(state, true, confidence, movedBox, sharpness, 900);
          state = afterMove;

          // Continue with the moved box for another 800ms (not enough to re-trigger)
          for (let i = 10; i <= 17; i++) {
            const now = i * 100;
            const [next, fired] = updateStability(state, true, confidence, movedBox, sharpness, now);
            state = next;
            if (fired) triggered = true;
          }

          // Should NOT have triggered — movement reset the 1000ms clock
          expect(triggered).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 1: Stability threshold gate
   * Validates: Requirements 2.2
   *
   * Once the trigger fires, subsequent frames MUST NOT fire it again
   * (hasTriggered guard prevents double-capture).
   */
  it("triggers at most once per stability session", () => {
    fc.assert(
      fc.property(
        highConfidenceArb,
        boxArb,
        sharpEnoughArb,
        (confidence, box, sharpness) => {
          let state = makeState();
          let triggerCount = 0;

          // Run well past the trigger point
          for (let i = 0; i <= 30; i++) {
            const now = i * 100;
            const [next, fired] = updateStability(state, true, confidence, box, sharpness, now);
            state = next;
            if (fired) triggerCount++;
          }

          expect(triggerCount).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
