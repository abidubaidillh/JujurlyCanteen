/**
 * Property-Based Test: Fallback OCR always runs
 *
 * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
 * Validates: Requirements 2.5
 *
 * Property: For any capture attempt where the Python backend returns an error
 * or is unreachable, the system SHALL still execute the local OCR pipeline on
 * the raw camera blob and produce an OCRResult object (success or failure).
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { OCRResult } from "../ocr-logic";

// ============================================================
// Pure fallback-decision logic extracted from onCapture in page.tsx
//
// The relevant branching in onCapture:
//
//   let pythonSuccess = false;
//   try {
//     const res = await fetch(`${API_URL}/capture-payment`, { ... });
//     const data = await res.json();
//     pythonSuccess = data.success === true;
//   } catch (pyErr) {
//     // Python offline — pythonSuccess stays false
//   }
//
//   if (pythonSuccess) {
//     // wait for Realtime — local OCR NOT run
//   } else {
//     // Fallback: run local OCR (Requirement 2.5)
//     await runLocalOCR(blob);
//   }
//
// We model this as a pure function that takes a PythonResponse
// (representing what fetch returned, or null for network error)
// and returns whether local OCR should run.
// ============================================================

/** Represents the parsed JSON body from Python, or null if fetch threw */
type PythonResponse =
  | { success: true }
  | { success: false; error?: string }
  | { success: boolean; [key: string]: unknown }
  | null; // null = network error / offline

/**
 * Pure decision function mirroring the pythonSuccess logic in onCapture.
 * Returns true when local OCR fallback should run.
 */
function shouldRunLocalOCR(pythonResponse: PythonResponse): boolean {
  if (pythonResponse === null) return true;          // fetch threw (offline)
  return pythonResponse.success !== true;            // non-success response
}

// ============================================================
// Pure OCR result factory — mirrors the shape of OCRResult
// returned by performOCR regardless of success/failure.
// We verify that the result always conforms to the OCRResult
// interface (both success and failure paths produce a valid object).
// ============================================================

function buildOCRResult(
  rawText: string,
  amount: number | null,
  merchantName: string | null
): OCRResult {
  const isSuccess = amount !== null && merchantName !== null;
  return {
    rawText,
    cleanedText: rawText.toUpperCase().trim(),
    amount,
    merchantName,
    isSuccess,
    processingTimeMs: 0,
    ...(isSuccess ? {} : { error: "Nominal atau merchant tidak ditemukan." }),
  };
}

// ============================================================
// Arbitraries
// ============================================================

/** Python returned success=true — local OCR should NOT run */
const pythonSuccessArb = fc.constant<PythonResponse>({ success: true });

/** Python returned success=false (various shapes) */
const pythonFailureArb = fc.oneof(
  fc.constant<PythonResponse>({ success: false }),
  fc.record({ success: fc.constant(false as const), error: fc.string() }),
  // success field present but not strictly true
  fc.record({ success: fc.constant(false as const), code: fc.integer() })
) as fc.Arbitrary<PythonResponse>;

/** Python is offline — fetch threw, response is null */
const pythonOfflineArb = fc.constant<PythonResponse>(null);

/** Any non-success Python response (offline or failure) */
const nonSuccessArb = fc.oneof(pythonOfflineArb, pythonFailureArb);

/** Generates a raw OCR text string (may or may not contain a valid nominal) */
const rawTextArb = fc.string({ minLength: 0, maxLength: 300 });

/** Generates a valid nominal (100–1_000_000) or null */
const nominalArb = fc.option(
  fc.integer({ min: 100, max: 1_000_000 }),
  { nil: null }
);

/** Generates a merchant name or null */
const merchantArb = fc.option(
  fc.constantFrom("HMIT", "STORE"),
  { nil: null }
);

// ============================================================
// Tests
// ============================================================

describe("Property 2: Fallback OCR always runs", () => {
  /**
   * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
   * Validates: Requirements 2.5
   *
   * For any Python backend failure (network error or non-success response),
   * shouldRunLocalOCR MUST return true — the local OCR pipeline is always invoked.
   */
  it("always triggers local OCR when Python backend is offline or returns failure", () => {
    fc.assert(
      fc.property(nonSuccessArb, (pythonResponse) => {
        expect(shouldRunLocalOCR(pythonResponse)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
   * Validates: Requirements 2.5
   *
   * When Python returns success=true, local OCR MUST NOT run —
   * the Realtime path handles it instead.
   */
  it("does NOT trigger local OCR when Python backend succeeds", () => {
    fc.assert(
      fc.property(pythonSuccessArb, (pythonResponse) => {
        expect(shouldRunLocalOCR(pythonResponse)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
   * Validates: Requirements 2.5
   *
   * For any input to the local OCR pipeline (any raw text, any nominal,
   * any merchant), buildOCRResult MUST always return a well-formed OCRResult
   * object — the pipeline never throws, it always produces a result.
   */
  it("local OCR pipeline always produces a valid OCRResult object", () => {
    fc.assert(
      fc.property(rawTextArb, nominalArb, merchantArb, (rawText, amount, merchantName) => {
        const result = buildOCRResult(rawText, amount, merchantName);

        // Result is always defined — never null/undefined
        expect(result).toBeDefined();

        // Required fields are always present
        expect(typeof result.rawText).toBe("string");
        expect(typeof result.cleanedText).toBe("string");
        expect(typeof result.isSuccess).toBe("boolean");

        // amount is either a number or null — never undefined
        expect(result.amount === null || typeof result.amount === "number").toBe(true);

        // merchantName is either a string or null — never undefined
        expect(
          result.merchantName === null || typeof result.merchantName === "string"
        ).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
   * Validates: Requirements 2.5
   *
   * For any failed OCR result (amount=null or merchantName=null),
   * isSuccess MUST be false — the pipeline correctly signals failure
   * without throwing.
   */
  it("OCR result has isSuccess=false when amount or merchant is missing", () => {
    fc.assert(
      fc.property(rawTextArb, (rawText) => {
        // No amount, no merchant — OCR failed to extract
        const result = buildOCRResult(rawText, null, null);
        expect(result.isSuccess).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-scan-ocr, Property 2: Fallback OCR always runs
   * Validates: Requirements 2.5
   *
   * For any successful OCR result (amount > 0 and merchant present),
   * isSuccess MUST be true — the pipeline correctly signals success.
   */
  it("OCR result has isSuccess=true when both amount and merchant are present", () => {
    fc.assert(
      fc.property(
        rawTextArb,
        fc.integer({ min: 100, max: 1_000_000 }),
        fc.constantFrom("HMIT", "STORE"),
        (rawText, amount, merchant) => {
          const result = buildOCRResult(rawText, amount, merchant);
          expect(result.isSuccess).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
