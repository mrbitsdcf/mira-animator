/**
 * Property 8: Template name validation
 * **Validates: Requirements 6.2, 10.6**
 *
 * For any string, the name validator SHALL accept it if and only if it matches
 * the pattern ^[a-z][a-z0-9-]{1,48}[a-z0-9]$ AND is not in the reserved names list.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidTemplateName, RESERVED_NAMES } from '../../lib/brand/color-utils.js';

const NAME_PATTERN = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

/**
 * Arbitrary that generates strings matching the valid name pattern:
 * - Starts with [a-z]
 * - Middle is [a-z0-9-]{1,48}
 * - Ends with [a-z0-9]
 * - Total length: 3 to 50 characters
 * - Excludes reserved names
 */
const validNameArb = fc
    .tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 1, maxLength: 48 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 1 }),
    )
    .map(([first, middle, last]) => first + middle + last)
    .filter((name) => NAME_PATTERN.test(name) && !RESERVED_NAMES.includes(name));

/**
 * Arbitrary that generates invalid names using different strategies:
 * - Too short (< 3 chars)
 * - Starts with non-lowercase letter
 * - Ends with hyphen
 * - Contains uppercase
 * - Contains special characters
 * - Too long (> 50 chars)
 */
const invalidNameArb = fc.oneof(
    // Too short: 0-2 characters
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 0, maxLength: 2 }),
    // Starts with a digit
    fc.tuple(
        fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 1, maxLength: 10 }),
    ).map(([d, rest]) => d + rest),
    // Starts with a hyphen
    fc.tuple(
        fc.constant('-'),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 2, maxLength: 10 }),
    ).map(([h, rest]) => h + rest),
    // Ends with a hyphen
    fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 1, maxLength: 10 }),
        fc.constant('-'),
    ).map(([first, mid, last]) => first + mid + last),
    // Contains uppercase letters
    fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 1, maxLength: 3 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 5 }),
    ).map(([first, upper, rest]) => first + upper + rest),
    // Contains special characters
    fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 1 }),
        fc.constantFrom('_', '.', ' ', '!', '@', '#', '$'),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 5 }),
    ).map(([first, special, rest]) => first + special + rest),
    // Too long: > 50 characters
    fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 1 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 49, maxLength: 60 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 1 }),
    ).map(([first, mid, last]) => first + mid + last),
);

describe('Property 8: Template name validation', () => {
    test('valid names (matching pattern, not reserved) are accepted', () => {
        fc.assert(
            fc.property(validNameArb, (name) => {
                expect(isValidTemplateName(name)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    test('invalid names (not matching pattern) are rejected', () => {
        fc.assert(
            fc.property(invalidNameArb, (name) => {
                expect(isValidTemplateName(name)).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    test('reserved names are always rejected even if they match the pattern', () => {
        fc.assert(
            fc.property(fc.constantFrom(...RESERVED_NAMES), (name) => {
                // All reserved names match the regex pattern
                expect(NAME_PATTERN.test(name)).toBe(true);
                // But isValidTemplateName rejects them
                expect(isValidTemplateName(name)).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    test('isValidTemplateName is equivalent to pattern match AND not reserved', () => {
        fc.assert(
            fc.property(fc.string({ minLength: 0, maxLength: 60 }), (name) => {
                const expected = NAME_PATTERN.test(name) && !RESERVED_NAMES.includes(name);
                expect(isValidTemplateName(name)).toBe(expected);
            }),
            { numRuns: 200 },
        );
    });
});
