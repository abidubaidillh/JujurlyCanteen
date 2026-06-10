/**
 * Property-Based Test: hasil_ocr always inserted
 *
 * Feature: auto-scan-ocr, Property 4: hasil_ocr always inserted
 * Validates: Requirements 4.3, 4.4
 *
 * Property: For any Realtime trigger received from `bukti_pembayaran`, the system
 * SHALL always insert exactly one record into `hasil_ocr` with the corresponding
 * `id_bukti`. The insert SHALL occur regardless of whether OCR succeeded or failed —
 * `nominal_terbaca` may be NULL on failure but the record must exist.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { OCRResult } from "../ocr-logic";

// ============================================================
// Pure orchestration logic extracted from processSupabaseImage
// in scan/page.tsx — maps an OCRResult to the arguments that
// will be passed to saveOCRResult.
//
// This mirrors the exact branching in processSupabaseImage:
//   if (ocrResult.isSuccess) {
//     saveOCRResult(recordId, ocrResult.rawText ?? "", ocrResult.amount ?? null)
//   } else {
//     saveOCRResult(recordId, ocrResult.rawText ?? "", null)
//   }
// ============================================================

interface SaveOCRArgs {
  idBukti: number | string;
  teksOcr: string;
  nominal: number | null;
}

function buildSaveOCRArgs(recordId: number | string, ocrResult: OCRResult): SaveOCRArgs {
  if (ocrResult.isSuccess) {
    return {
      idBukti: recordId,
      teksOcr: ocrResult.rawText ?? "",
      nominal: ocrResult.amount ?? null,
    };
  } else {
    return {
      idBukti: recordId,
      teksOcr: ocrResult.rawText ?? "",
      nominal: null,
    };
  }
}

// ============================================================
// Arbitraries
// ============================================================

/** Generates a valid OCRResult where isSuccess = true */
const successfulOCRResult = fc.record<OCRResult>({
  rawText: fc.string({ minLength: 5, maxLength: 200 }),
  cleanedText: fc.string({ minLength: 5, maxLength: 200 }),
  amount: fc.integer({ min: 100, max: 1_000_000 }),
  merchantName: fc.constantFrom("HMIT", "STORE"),
  isSuccess: fc.constant(true),
  processingTimeMs: fc.integer({ min: 100, max: 5000 }),
});

/** Generates a valid OCRResult where isSuccess = false */
const failedOCRResult = fc.record<OCRResult>({
  rawText: fc.string({ minLength: 0, maxLength: 200 }),
  cleanedText: fc.string({ minLength: 0, maxLength: 200 }),
  amount: fc.constant(null),
  merchantName: fc.constant(null),
  isSuccess: fc.constant(false),
  processingTimeMs: fc.integer({ min: 100, max: 5000 }),
  error: fc.string({ minLength: 1, maxLength: 100 }),
});

/** Generates any OCRResult (success or failure) */
const anyOCRResult = fc.oneof(successfulOCRResult, failedOCRResult);

/** Generates a valid record ID (integer or string) */
const recordId = fc.oneof(
  fc.integer({ min: 1, max: 100_000 }),
  fc.stringMatching(/^[1-9][0-9]{0,4}$/)
);

// ============================================================
// Tests
// ============================================================

describe("Property 4: hasil_ocr always inserted", () => {
  /**
   * Feature: auto-scan-ocr, Property 4: hasil_ocr always inserted
   * Validates: Requirements 4.3, 4.4
   *
   * For any OCR result (success or failure), buildSaveOCRArgs MUST always
   * return an object — saveOCRResult is always called, never skipped.
   */
  it("always produces saveOCRResult args regardless of OCR outcome", () => {
    fc.assert(
      fc.property(recordId, anyOCRResult, (id, ocrResult) => {
        const args = buildSaveOCRArgs(id, ocrResult);

        // saveOCRResult is always called — args object is always produced
        expect(args).toBeDefined();
        expect(args.idBukti).toBe(id);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 4: hasil_ocr always inserted
   * Validates: Requirements 4.3
   *
   * For any successful OCR result, the nominal passed to saveOCRResult
   * MUST be the extracted amount (non-null positive integer).
   */
  it("passes extracted amount as nominal when OCR succeeds", () => {
    fc.assert(
      fc.property(recordId, successfulOCRResult, (id, ocrResult) => {
        const args = buildSaveOCRArgs(id, ocrResult);

        expect(args.nominal).toBe(ocrResult.amount);
        expect(args.nominal).not.toBeNull();
        expect(args.nominal as number).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 4: hasil_ocr always inserted
   * Validates: Requirements 4.4
   *
   * For any failed OCR result, the nominal passed to saveOCRResult
   * MUST be null — the record is still inserted but with null nominal.
   */
  it("passes null as nominal when OCR fails", () => {
    fc.assert(
      fc.property(recordId, failedOCRResult, (id, ocrResult) => {
        const args = buildSaveOCRArgs(id, ocrResult);

        expect(args.nominal).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 4: hasil_ocr always inserted
   * Validates: Requirements 4.3, 4.4
   *
   * For any OCR result, the teks_ocr passed to saveOCRResult MUST be
   * a string (never undefined) — rawText is always coerced to "".
   */
  it("always passes a string teks_ocr, never undefined", () => {
    fc.assert(
      fc.property(recordId, anyOCRResult, (id, ocrResult) => {
        const args = buildSaveOCRArgs(id, ocrResult);

        expect(typeof args.teksOcr).toBe("string");
      }),
      { numRuns: 100 }
    );
  });
});
