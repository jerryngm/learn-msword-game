/// <reference path="../pb_data/types.d.ts" />

// The app files have no build hashes, so a browser left to guess caches them for days and can mix
// old and new modules after an update. "no-cache" makes it re-check each file: unchanged files cost
// a 304, changed ones are always fetched fresh.
routerUse((e) => {
  if (!e.request.url.path.startsWith("/api/") && !e.request.url.path.startsWith("/_/")) {
    e.response.header().set("Cache-Control", "no-cache");
  }
  return e.next();
});
