self.addEventListener('push', function(event) {
    let options = {
      body: event.data.text(),
      icon: '/icon.png',  // 푸시 알림 아이콘
      badge: '/badge.png' // 푸시 알림 배지
    };
  
    event.waitUntil(
      self.registration.showNotification('구마톡 | 메시지 도착', options)
    );
  });
  