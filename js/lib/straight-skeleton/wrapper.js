// Load the straight-skeleton library from a local file with commit-aware
// cache busting so production always gets assets matching the JS bundle.
const commit = (window.commit !== undefined && window.commit !== null) ? String(window.commit) : '';
const cache_suffix = (commit.length > 0) ? ('?' + encodeURIComponent(commit)) : '';
const index_url = '/js/lib/straight-skeleton/index.js' + cache_suffix;

window.SkeletonBuilderReady = import(index_url)
  .then(function(module) {
    const SkeletonBuilder = (module !== undefined && module.SkeletonBuilder !== undefined)
      ? module.SkeletonBuilder
      : window.SkeletonBuilder;

    if (SkeletonBuilder === undefined) {
      throw new Error('Failed to load local straight-skeleton runtime');
    }

    // Expose immediately so callers can check for availability.
    window.SkeletonBuilder = SkeletonBuilder;

    return SkeletonBuilder.init().then(function() {
      window.SkeletonBuilderInitialized = true;
      window.dispatchEvent(new Event('skeleton_builder_ready'));
      return SkeletonBuilder;
    });
  })
  .catch(function(error) {
    window.SkeletonBuilderInitError = error;
    window.dispatchEvent(new Event('skeleton_builder_error'));
    console.error('Straight-skeleton runtime failed to initialize:', error);
    return undefined;
  });
