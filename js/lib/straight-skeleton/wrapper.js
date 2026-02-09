// Import the straight-skeleton library from CDN
import { SkeletonBuilder } from 'https://esm.sh/straight-skeleton@2.0.1';

// Initialize the WASM module
await SkeletonBuilder.init();

// Expose to global scope so the rest of the codebase can use it
window.SkeletonBuilder = SkeletonBuilder;

// Log confirmation that it's ready
console.log('SkeletonBuilder ready');
