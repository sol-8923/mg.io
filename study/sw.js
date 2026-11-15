/* 가족 채팅 알림용 서비스 워커: 알림을 누르면 채팅 화면을 연다 */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = new URL('./#/chat', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0) { return c.focus().then(function(w){ return (w && w.navigate) ? w.navigate(url) : null; }); }
    }
    return self.clients.openWindow(url);
  }));
});
