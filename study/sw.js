/* 가족 채팅 알림용 서비스 워커
 * - FCM 푸시: 앱을 닫아도 새 메시지 알림이 뜨게 한다(Cloud Function notifyChat이 전송).
 * - 앱이 열려 있을 때 화면에서 띄운 알림을 누르면 채팅 화면을 연다. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({ projectId: 'mg-study', appId: '1:905539239303:web:d40dc31575073f4998e722', messagingSenderId: '905539239303', apiKey: 'unused' });
firebase.messaging();   // 서버가 보낸 notification 메시지는 SDK가 자동으로 표시하고 누르면 link를 연다

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function(e){
  if (e.notification.data && e.notification.data.FCM_MSG) return;   // FCM 알림은 SDK가 처리
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
