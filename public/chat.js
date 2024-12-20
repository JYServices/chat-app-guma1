window.onload = function() {
    // 알림 권한 부여
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        } else {
          console.log('Notification permission denied.');
        }
      });
    }
    console.log("알림관련뭔가됨.")
    // 서비스 워커 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  };
  

  // 기존 소켓 연결 및 메시지 처리
  if (!window.socket) {
    window.socket = io();
  }
  const socket = window.socket;
  let currentRoom = '';
  if (!username) {
    alert('User session expired. Please log in again.');
    window.location.href = '/login';
  }

  function joinRoom(room) {
    if (currentRoom) {
      socket.emit('leaveRoom', currentRoom);
    }
    currentRoom = room;
    document.getElementById('room-name').innerText = room;
    document.getElementById('chat-container').style.display = 'block';
    socket.emit('joinRoom', room, username);
  }
// 푸시 알림 수신
self.addEventListener('push', function(event) {
    let options = {
      body: event.data.text(),
      icon: '/icon.png',  // 푸시 알림 아이콘
      badge: '/badge.png' // 푸시 알림 배지
    };
  
    // 알림 제목 수정
    event.waitUntil(
      self.registration.showNotification('구마톡 | 메시지 도착', options)
    );
  });
  
  document.getElementById('message-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const message = document.getElementById('message').value;

    // 자신의 메시지를 바로 화면에 표시
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <img src="${profilePicture}" alt="${username}'s profile" style="width: 40px; height: 40px; border-radius: 50%; cursor: pointer;" onclick="showPopup('${profilePicture}')">
        <div style="margin-left: 10px;">
          <strong>${username}</strong>: ${message}
          <div style="font-size: 0.8em; color: gray;">${new Date().toLocaleTimeString()}</div>
        </div>
      </div>`;
    document.getElementById('messages').appendChild(msgDiv);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;

    // 서버로 메시지 전송
    socket.emit('chatMessage', { room: currentRoom, message, username, profilePicture });

    // 입력 필드 초기화
    document.getElementById('message').value = '';
});


  socket.on('chatMessage', ({ message, username, timestamp, profilePicture }) => {
    const messages = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <img src="${profilePicture}" alt="${username}'s profile" style="width: 40px; height: 40px; border-radius: 50%; cursor: pointer;" onclick="showPopup('${profilePicture}')">
        <div style="margin-left: 10px;">
          <strong>${username}</strong>: ${message}
          <div style="font-size: 0.8em; color: gray;">${new Date(timestamp).toLocaleTimeString()}</div>
        </div>
      </div>`;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
    if (Notification.permission === 'granted') {
        new Notification('구마톡 | 메시지 도착', { body: `${username}: ${message}`, icon: '/icon.png' });
    }
  });

  socket.on('chatHistory', (history) => {
    const messages = document.getElementById('messages');
    messages.innerHTML = '';
    history.forEach(({ message, username, timestamp, profilePicture }) => {
      const msgDiv = document.createElement('div');
      msgDiv.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <img src="${profilePicture}" alt="${username}'s profile" style="width: 40px; height: 40px; border-radius: 50%; cursor: pointer;" onclick="showPopup('${profilePicture}')">
          <div style="margin-left: 10px;">
            <strong>${username}</strong>: ${message}
            <div style="font-size: 0.8em; color: gray;">${new Date(timestamp).toLocaleTimeString()}</div>
          </div>
        </div>`;
      messages.appendChild(msgDiv);
    });
    messages.scrollTop = messages.scrollHeight;
  });

  function showPopup(profilePicture) {
    const popup = document.getElementById('profile-popup');
    const popupImage = document.getElementById('popup-image');
    popupImage.src = profilePicture;
    popup.style.display = 'block';
  }

  function closePopup() {
    const popup = document.getElementById('profile-popup');
    popup.style.display = 'none';
  }