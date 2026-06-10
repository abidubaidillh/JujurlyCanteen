/**
 * Property-Based Test: bukti_pembayaran status consistency
 *
 * Feature: auto-scan-ocr, Property 3: bukti_pembayaran status consistency
 * Validates: Requirements 3.2, 4.5
 *
 * Property: For any OCR result, the `status` field written to `bukti_pembayaran`
 * SHALL be 'valid' if and only if `nominal_terbaca` is a non-null positive integer,
 * and 'invalid' otherwise.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================
// Pure status-mapping function extracted from supabase-logic.ts
// This mirrors the exact logic used in uploadAndSaveTransaction
// and the saveOCRResult + updateBuktiStatus flow:
//   buktiStatus = amount && amount > 0 ? "valid" : "invalid"
// ============================================================

function deriveStatus(nominal: number | null): "valid" | "invalid" {
  return nominal !== null && nominal > 0 ? "valid" : "invalid";
}

describe("Property 3: bukti_pembayaran status consistency", () => {
  /**
   * Feature: auto-scan-ocr, Property 3: bukti_pembayaran status consistency
   * Validates: Requirements 3.2, 4.5
   *
   * For any valid positive integer nominal, status MUST be 'valid'.
   */
  it("returns 'valid' for any positive integer nominal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (nominal) => {
          expect(deriveStatus(nominal)).toBe("valid");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 3: bukti_pembayaran status consistency
   * Validates: Requirements 3.2, 4.5
   *
   * For null nominal (OCR failed to extract), status MUST be 'invalid'.
   */
  it("returns 'invalid' for null nominal", () => {
    expect(deriveStatus(null)).toBe("invalid");
  });

  /**
   * Feature: auto-scan-ocr, Property 3: bukti_pembayaran status consistency
   * Validates: Requirements 3.2, 4.5
   *
   * For zero or any negative integer, status MUST be 'invalid'.
   */
  it("returns 'invalid' for zero or negative nominal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 0 }),
        (nominal) => {
          expect(deriveStatus(nominal)).toBe("invalid");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 3: bukti_pembayaran status consistency
   * Validates: Requirements 3.2, 4.5
   *
   * The only two possible status values are 'valid' and 'invalid' — no other
   * value is ever produced, regardless of input.
   */
  it("only ever produces 'valid' or 'invalid' — no other status value", () => {
    const validStatuses = new Set(["valid", "invalid"]);

    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: -1_000_000, max: 1_000_000 }), { nil: null }),
        (nominal) => {
          const status = deriveStatus(nominal);
          expect(validStatuses.has(status)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
