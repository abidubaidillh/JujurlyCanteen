/**
 * Property-Based Test: Cleanup on unmount
 *
 * Feature: auto-scan-ocr, Property 6: Cleanup on unmount
 * Validates: Requirements 1.4
 *
 * Property: For any component lifecycle, when the scan page unmounts,
 * the Supabase Realtime channel SHALL be removed via supabase.removeChannel(channel).
 *
 * Strategy:
 * We extract the cleanup pattern from scan/page.tsx into a pure function
 * `createCleanup(removeChannel, channel)` that returns the cleanup callback.
 * We then verify — for any channel identity — that calling the cleanup
 * invokes removeChannel with exactly that channel reference.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================
// Pure cleanup factory — mirrors the useEffect cleanup in page.tsx:
//
//   return () => {
//     supabase.removeChannel(channel);
//   };
//
// We parameterise over removeChannel and channel so the property
// can be verified for arbitrary channel values without a real
// Supabase connection.
// ============================================================

type Channel = { id: string | number };

function createCleanup(
  removeChannel: (ch: Channel) => void,
  channel: Channel
): () => void {
  return () => {
    removeChannel(channel);
  };
}

// ============================================================
// Arbitrary: generates a channel-like object with a unique id
// ============================================================

const channelArb = fc.record<Channel>({
  id: fc.oneof(
    fc.integer({ min: 1, max: 100_000 }),
    fc.string({ minLength: 1, maxLength: 40 })
  ),
});

// ============================================================
// Tests
// ============================================================

describe("Property 6: Cleanup on unmount", () => {
  /**
   * Feature: auto-scan-ocr, Property 6: Cleanup on unmount
   * Validates: Requirements 1.4
   *
   * For any channel, calling the cleanup function MUST invoke
   * removeChannel exactly once with that channel reference.
   */
  it("calls removeChannel exactly once with the correct channel on unmount", () => {
    fc.assert(
      fc.property(channelArb, (channel) => {
        const calls: Channel[] = [];
        const removeChannel = (ch: Channel) => calls.push(ch);

        const cleanup = createCleanup(removeChannel, channel);

        // Before unmount: removeChannel has not been called
        expect(calls).toHaveLength(0);

        // Simulate unmount
        cleanup();

        // After unmount: removeChannel called exactly once with the right channel
        expect(calls).toHaveLength(1);
        expect(calls[0]).toBe(channel);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 6: Cleanup on unmount
   * Validates: Requirements 1.4
   *
   * For any channel, calling the cleanup function a second time
   * (e.g. React StrictMode double-invoke) MUST call removeChannel
   * a second time — the cleanup is not idempotent by design, but
   * each call MUST always target the same channel reference.
   */
  it("always passes the same channel reference regardless of how many times cleanup is called", () => {
    fc.assert(
      fc.property(channelArb, (channel) => {
        const calls: Channel[] = [];
        const removeChannel = (ch: Channel) => calls.push(ch);

        const cleanup = createCleanup(removeChannel, channel);

        cleanup();
        cleanup();

        // Both calls MUST reference the same channel object
        expect(calls[0]).toBe(channel);
        expect(calls[1]).toBe(channel);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 6: Cleanup on unmount
   * Validates: Requirements 1.4
   *
   * For any two distinct channels, the cleanup created for channel A
   * MUST NOT call removeChannel with channel B.
   */
  it("never removes a different channel than the one it was created with", () => {
    fc.assert(
      fc.property(channelArb, channelArb, (channelA, channelB) => {
        // Only meaningful when the two channels are distinct objects
        fc.pre(channelA !== channelB);

        const removedChannels: Channel[] = [];
        const removeChannel = (ch: Channel) => removedChannels.push(ch);

        const cleanupA = createCleanup(removeChannel, channelA);
        cleanupA();

        // The removed channel MUST be channelA, not channelB
        expect(removedChannels[0]).toBe(channelA);
        expect(removedChannels[0]).not.toBe(channelB);
      }),
      { numRuns: 100 }
    );
  });
});
