/**
 * Property 10: Error messages include contextual information
 * **Validates: Requirements 10.1, 10.3**
 *
 * For any file path that does not exist on disk, the error message SHALL contain
 * the exact path string.
 * For any ZIP archive containing only unsupported file extensions, the error message
 * SHALL list all file names found inside the archive.
 */
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { extract } from '../../lib/brand/extractor.js';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Arbitrary that generates random file paths that don't exist on disk.
 * Uses valid extensions so the error is "file not found" rather than "unsupported format".
 */
const nonExistentPathArb = fc
    .tuple(
        fc.array(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), {
                minLength: 1,
                maxLength: 10,
            }),
            { minLength: 1, maxLength: 4 },
        ),
        fc.constantFrom('.css', '.html', '.pdf', '.pptx', '.svg', '.csv', '.png', '.jpg', '.webp', '.zip'),
    )
    .map(([segments, ext]) => `/nonexistent/${segments.join('/')}${ext}`);

/**
 * Build a minimal valid ZIP buffer containing files with the given names.
 * Uses Store method (no compression) for simplicity.
 * @param {Array<{name: string, content: string}>} files
 * @returns {Buffer} ZIP file buffer
 */
function buildZipBuffer(files) {
    const entries = [];
    let offset = 0;

    // Build local file headers + data
    const localParts = [];
    for (const { name, content } of files) {
        const nameBuffer = Buffer.from(name, 'utf-8');
        const contentBuffer = Buffer.from(content, 'utf-8');

        // Local file header (30 bytes + name + content)
        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50, 0);  // Local file header signature
        header.writeUInt16LE(20, 4);           // Version needed to extract (2.0)
        header.writeUInt16LE(0, 6);            // General purpose bit flag
        header.writeUInt16LE(0, 8);            // Compression method: stored
        header.writeUInt16LE(0, 10);           // Last mod time
        header.writeUInt16LE(0, 12);           // Last mod date
        // CRC-32 - compute simple CRC
        const crc = crc32(contentBuffer);
        header.writeUInt32LE(crc, 14);         // CRC-32
        header.writeUInt32LE(contentBuffer.length, 18);  // Compressed size
        header.writeUInt32LE(contentBuffer.length, 22);  // Uncompressed size
        header.writeUInt16LE(nameBuffer.length, 26);     // Filename length
        header.writeUInt16LE(0, 28);           // Extra field length

        const localEntry = Buffer.concat([header, nameBuffer, contentBuffer]);
        entries.push({ name: nameBuffer, content: contentBuffer, offset, crc, localEntry });
        localParts.push(localEntry);
        offset += localEntry.length;
    }

    // Build central directory
    const centralParts = [];
    for (const entry of entries) {
        const cdHeader = Buffer.alloc(46);
        cdHeader.writeUInt32LE(0x02014b50, 0);   // Central directory header signature
        cdHeader.writeUInt16LE(20, 4);            // Version made by
        cdHeader.writeUInt16LE(20, 6);            // Version needed to extract
        cdHeader.writeUInt16LE(0, 8);             // General purpose bit flag
        cdHeader.writeUInt16LE(0, 10);            // Compression method: stored
        cdHeader.writeUInt16LE(0, 12);            // Last mod time
        cdHeader.writeUInt16LE(0, 14);            // Last mod date
        cdHeader.writeUInt32LE(entry.crc, 16);    // CRC-32
        cdHeader.writeUInt32LE(entry.content.length, 20);  // Compressed size
        cdHeader.writeUInt32LE(entry.content.length, 24);  // Uncompressed size
        cdHeader.writeUInt16LE(entry.name.length, 28);     // Filename length
        cdHeader.writeUInt16LE(0, 30);            // Extra field length
        cdHeader.writeUInt16LE(0, 32);            // File comment length
        cdHeader.writeUInt16LE(0, 34);            // Disk number start
        cdHeader.writeUInt16LE(0, 36);            // Internal file attributes
        cdHeader.writeUInt32LE(0, 38);            // External file attributes
        cdHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header

        centralParts.push(Buffer.concat([cdHeader, entry.name]));
    }

    const centralDir = Buffer.concat(centralParts);
    const centralDirOffset = offset;

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);          // End of central directory signature
    eocd.writeUInt16LE(0, 4);                    // Number of this disk
    eocd.writeUInt16LE(0, 6);                    // Disk where central directory starts
    eocd.writeUInt16LE(entries.length, 8);        // Number of central directory records on this disk
    eocd.writeUInt16LE(entries.length, 10);       // Total number of central directory records
    eocd.writeUInt32LE(centralDir.length, 12);   // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);    // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                   // Comment length

    return Buffer.concat([...localParts, centralDir, eocd]);
}

/**
 * Simple CRC-32 implementation for ZIP file generation.
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xedb88320;
            } else {
                crc = crc >>> 1;
            }
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

describe('Property 10: Error messages include contextual information', () => {
    test('Property 10a: File not found errors contain the exact path', async () => {
        await fc.assert(
            fc.asyncProperty(nonExistentPathArb, async (path) => {
                try {
                    await extract({ source: path });
                    expect.fail('Expected extract to throw for non-existent path');
                } catch (err) {
                    expect(err.message).toContain(path);
                }
            }),
            { numRuns: 100 },
        );
    });

    test('Property 10b: ZIP with unsupported files lists found filenames', async () => {
        // Deterministic list of unsupported file names
        const unsupportedFiles = [
            { name: 'report.txt', content: 'some text content' },
            { name: 'data.doc', content: 'document content' },
            { name: 'notes.rtf', content: 'rich text' },
            { name: 'config.ini', content: 'key=value' },
        ];

        // Build a ZIP buffer with only unsupported file extensions
        const zipBuffer = buildZipBuffer(unsupportedFiles);

        // Write ZIP to a temp file with .zip extension
        const tmpDir = await mkdtemp(join(tmpdir(), 'mira-test-'));
        const zipPath = join(tmpDir, 'test-unsupported.zip');
        await writeFile(zipPath, zipBuffer);

        try {
            await extract({ source: zipPath });
            expect.fail('Expected extract to throw for ZIP with only unsupported files');
        } catch (err) {
            // The error message should list all file names found inside the archive
            for (const { name } of unsupportedFiles) {
                expect(err.message).toContain(name);
            }
        } finally {
            // Cleanup
            await unlink(zipPath).catch(() => { });
        }
    });
});
