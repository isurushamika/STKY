self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(function(clientList) {
    if (clientList.length > 0) {
      return clientList[0].focus();
    }
    return clients.openWindow('/');
  }));
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'stky', body: 'Reminder' };
  const title = data.title || 'stky reminder';
  const options = { body: data.body || 'Reminder', tag: data.tag };
  event.waitUntil(self.registration.showNotification(title, options));
});
