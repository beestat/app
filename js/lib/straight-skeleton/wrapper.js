// Load the straight-skeleton library from a local file.
import '/js/lib/straight-skeleton/index.js';

const SkeletonBuilder = window.SkeletonBuilder;
if (SkeletonBuilder === undefined) {
  throw new Error('Failed to load local straight-skeleton runtime');
}

// Initialize the WASM module
await SkeletonBuilder.init();

// Expose to global scope so the rest of the codebase can use it
window.SkeletonBuilder = SkeletonBuilder;
