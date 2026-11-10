<?php
  // The Apache rule that routes /analyze etc. to index.php also sets BEESTAT_CLEAN_URLS.
  // Until then, /index.php/analyze reaches the same page.
  $page_prefix = getenv('BEESTAT_CLEAN_URLS') ? '' : '/index.php';
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>beestat</title>
    <script>
      // The React app now lives at the root URLs (/detail, /analyze, ...) next to the classic app.
      // Old /react/index.php#/page links pick the new version on this device and move to the new URL.
      (function() {
        var hash = window.location.hash.replace(/^#\/?/, '').split('?');
        var query = new URLSearchParams(window.location.search);
        new URLSearchParams(hash[1] || '').forEach(function(value, key) { query.set(key, value); });
        query.set('ui', 'new');
        window.location.replace(<?php echo json_encode($page_prefix); ?> + '/' + hash[0] + '?' + query.toString());
      })();
    </script>
  </head>
  <body></body>
</html>
