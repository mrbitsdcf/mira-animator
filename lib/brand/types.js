/**
 * @fileoverview JSDoc type definitions for the mira-brand-template pipeline.
 * All types used across extractors, generators, and registry are defined here.
 */

/**
 * A logo asset extracted from brand source material.
 * @typedef {Object} LogoAsset
 * @property {Buffer} buffer - Raw image data
 * @property {string} filename - Original or derived filename
 * @property {string} format - Image format (png, svg, webp, jpg)
 */

/**
 * A structural layout pattern detected in brand source material.
 * @typedef {Object} LayoutPattern
 * @property {'grid' | 'single' | 'hero-content' | 'split'} type - Layout type classification
 * @property {1 | 2 | 3} columns - Number of columns in the layout
 * @property {boolean} hasHero - Whether the layout includes a hero/full-width section
 * @property {boolean} hasFooter - Whether the layout includes a footer section
 * @property {string} description - Human-readable description of the layout
 */

/**
 * Raw extraction result from a format parser before normalization.
 * @typedef {Object} RawExtraction
 * @property {string[]} colors - Hex color codes extracted, max 12
 * @property {string[]} fonts - Font family names extracted, max 5
 * @property {Buffer[]} logos - Logo image buffers found in the source
 * @property {LayoutPattern[]} layouts - Structural layout patterns detected
 * @property {string} sourceFormat - Detected source format identifier (e.g. 'pptx', 'pdf', 'css')
 */

/**
 * Result returned by individual format parsers.
 * @typedef {Object} ParseResult
 * @property {string[]} colors - Hex color codes found
 * @property {string[]} fonts - Font-family names found
 * @property {Buffer[]} logos - Logo image buffers found
 * @property {LayoutPattern[]} layouts - Structural patterns detected
 */

/**
 * The central brand identity data structure produced by the Brand Extractor.
 * @typedef {Object} BrandIdentity
 * @property {string} primary - Primary brand color as hex #RRGGBB
 * @property {string} [secondary] - Secondary brand color as hex #RRGGBB, if detected
 * @property {string} background - Background color as hex #RRGGBB
 * @property {'light' | 'dark'} mode - Theme mode derived from background luminance
 * @property {string} headingFont - Font-family for headings
 * @property {string} bodyFont - Font-family for body text
 * @property {boolean} fontsDefaulted - True if no font metadata was found in source
 * @property {LogoAsset[]} logos - Extracted logo assets
 * @property {LayoutPattern[]} layouts - Detected card/slide layout patterns
 * @property {string} sourceFormat - Source format identifier
 */

/**
 * A file asset to be written to the template output directory.
 * @typedef {Object} AssetFile
 * @property {string} filename - Output filename
 * @property {Buffer} buffer - File content as a Buffer
 * @property {'logo' | 'card-template'} type - Asset classification
 */

/**
 * Result returned by the Template Registry after writing files.
 * @typedef {Object} RegistryResult
 * @property {string} themePath - Path to the written theme CSS file
 * @property {string} deckPath - Path to the written deck template HTML file
 * @property {string} assetsPath - Path to the assets directory
 */

export { };
