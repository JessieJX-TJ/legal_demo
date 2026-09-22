/**
 * Fix relative asset resolution on GitHub Pages project sites.
 * Visiting /<repo> (no trailing slash) makes ./vendor/... resolve to /vendor/... (404).
 * Force a trailing slash so ./ paths stay under /<repo>/.
 */
(function () {
  var path = location.pathname;
  if (path.slice(-1) !== '/' && !/\.html?$/i.test(path)) {
    location.replace(path + '/' + location.search + location.hash);
  }
})();
