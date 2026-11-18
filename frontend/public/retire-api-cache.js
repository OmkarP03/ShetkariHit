// Keep this activation hook for clients upgrading from older releases.
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('sh-api'));
});
