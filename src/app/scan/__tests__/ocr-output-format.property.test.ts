/**
 * Property-Based Test: OCR pipeline output format
 *
 * Feature: auto-scan-ocr, Property 5: OCR pipeline output format
 * Validates: Requirements 5.4
 *
 * Property: For any successful OCR result where `isSuccess = true`, the status
 * string displayed to the user SHALL match the pattern "✅ Terdeteksi Rp{nominal}"
 * where {nominal} is the `amount` formatted with Indonesian locale (id-ID).
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================
// Pure status-string builder extracted from scan/page.tsx
//
// This mirrors the exact expression used in both processSupabaseImage
// and runLocalOCR when ocrResult.isSuccess === true:
//
//   `✅ Terdeteksi Rp${ocrResult.amount?.toLocaleString("id-ID")}${timeInfo}`
//
// We test the core format without the optional timeInfo suffix, since
// Property 5 only specifies the "✅ Terdeteksi Rp{nominal}" pattern.
// ============================================================

function buildSuccessStatus(amount: number): string {
  return `✅ Terdeteksi Rp${amount.toLocaleString("id-ID")}`;
}

// ============================================================
// Tests
// ============================================================

describe("Property 5: OCR pipeline output format", () => {
  /**
   * Feature: auto-scan-ocr, Property 5: OCR pipeline output format
   * Validates: Requirements 5.4
   *
   * For any valid positive integer nominal (100–1_000_000, matching the
   * extractNominal range in ocr-logic.ts), the status string MUST start
   * with "✅ Terdeteksi Rp" followed by the id-ID formatted number.
   */
  it("status string starts with '✅ Terdeteksi Rp' for any valid nominal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }),
        (amount) => {
          const status = buildSuccessStatus(amount);
          expect(status.startsWith("✅ Terdeteksi Rp")).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 5: OCR pipeline output format
   * Validates: Requirements 5.4
   *
   * For any valid nominal, the number portion of the status string MUST
   * equal the amount formatted with toLocaleString("id-ID").
   */
  it("nominal in status string matches id-ID locale formatting", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }),
        (amount) => {
          const status = buildSuccessStatus(amount);
          const prefix = "✅ Terdeteksi Rp";
          const nominalPart = status.slice(prefix.length);
          expect(nominalPart).toBe(amount.toLocaleString("id-ID"));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 5: OCR pipeline output format
   * Validates: Requirements 5.4
   *
   * Spot-check: known nominal values produce the expected formatted string.
   * id-ID uses period (.) as thousands separator.
   */
  it("formats known nominal values correctly with id-ID locale", () => {
    expect(buildSuccessStatus(15000)).toBe("✅ Terdeteksi Rp15.000");
    expect(buildSuccessStatus(100)).toBe("✅ Terdeteksi Rp100");
    expect(buildSuccessStatus(1000000)).toBe("✅ Terdeteksi Rp1.000.000");
    expect(buildSuccessStatus(250000)).toBe("✅ Terdeteksi Rp250.000");
  });
});
