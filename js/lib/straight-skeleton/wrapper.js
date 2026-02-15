// Load the straight-skeleton library from a local file.
import '/js/lib/straight-skeleton/index.js';

const SkeletonBuilder = window.SkeletonBuilder;
if (SkeletonBuilder === undefined) {
  throw new Error('Failed to load local straight-skeleton runtime');
}

// Expose immediately so callers can check for availability.
window.SkeletonBuilder = SkeletonBuilder;

// Expose readiness so callers can avoid using the runtime before init.
window.SkeletonBuilderReady = SkeletonBuilder.init()
  .then(function() {
    window.SkeletonBuilderInitialized = true;
    window.dispatchEvent(new Event('skeleton_builder_ready'));
    return SkeletonBuilder;
  })
  .catch(function(error) {
    window.SkeletonBuilderInitError = error;
    window.dispatchEvent(new Event('skeleton_builder_error'));
    return undefined;
  });
