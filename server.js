const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);
//upload 처리
const multer = require('multer');
const { profile } = require('console');
const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// User database simulation with file persistence
const userDbFile = path.join(__dirname, 'users.json');
let users = [];
if (fs.existsSync(userDbFile)) {
  users = JSON.parse(fs.readFileSync(userDbFile, 'utf-8'));
}

function saveUsers() {
  fs.writeFileSync(userDbFile, JSON.stringify(users, null, 2));
}

const rooms = ['자유 채팅', '반 문제 채팅', '공약 관련 채팅'];
const chatHistoryFile = path.join(__dirname, 'chatHistory.json');

// Load chat history from file
let chatHistory = {};
if (fs.existsSync(chatHistoryFile)) {
  chatHistory = JSON.parse(fs.readFileSync(chatHistoryFile, 'utf-8'));
} else {
  rooms.forEach((room) => {
    chatHistory[room] = [];
  });
  fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
}

// Save chat history to file
function saveChatHistory() {
  fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
}

//알림 기능 구현
const webPush = require('web-push');

// 푸시 토큰을 사용해 푸시 메시지 발송
const pushSubscription = {
  endpoint: '',
  keys: {
    p256dh: 'john322!',
    auth: 'authjohn322!'
  }
};

function sendPushNotification(username, message) {
  const payload = JSON.stringify({
    title: '구마톡 | 메시지 도착', // 제목
    body: `${username}: ${message}`, // 본문
    icon: '/icon.png', // 푸시 알림 아이콘
  });

  webPush.sendNotification(pushSubscription, payload)
    .then(response => {
      console.log('푸시 알림 전송 성공:', response);
    })
    .catch(error => {
      //console.error('푸시 알림 전송 실패:', error);
      console.error('푸시 알림 전송 실패:');
    });
}


// Routes
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const user = users.find((u) => u.username === req.session.user);
  const profilePicture = user?.profilePicture || '/uploads/default-profile.png';
  // `username`을 chat.ejs에 전달
  res.render('chat', { username: req.session.user, profilePicture: profilePicture, });
});


app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = username;
    return res.redirect('/');
  }
  res.status(401).send('Invalid credentials');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.some((u) => u.username === username)) {
    return res.status(409).send('User already exists');
  }
  const hashedPassword = bcrypt.hashSync(password, 14);
  users.push({ username, password: hashedPassword });
  saveUsers();
  res.redirect('/login');
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Chat logic
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (room, username) => {
      // 방 초기화 확인 (방이 처음 생성된 경우)
      if (!chatHistory[room]) {
          chatHistory[room] = [];
      }

      socket.join(room);
      console.log(`${username} joined room: ${room}`);

      // 방의 채팅 히스토리 전송
      socket.emit('chatHistory', chatHistory[room]);
  });

  socket.on('chatMessage', ({ room, message, username }) => {
      const user = users.find((u) => u.username === username);
      const profilePicture = user?.profilePicture || '/uploads/default-profile.png';
      const chatEntry = { message, username, timestamp: new Date().toISOString(), profilePicture };

      // 방이 유효하지 않으면 무시
      if (!chatHistory[room]) {
          console.error(`Room ${room} does not exist.`);
          return;
      }

      // 채팅 히스토리에 메시지 추가
      chatHistory[room].push(chatEntry);
      saveChatHistory();

      // 방의 다른 사용자들에게만 메시지 전송
      socket.broadcast.to(room).emit('chatMessage', chatEntry)
      console.log('Broadcasted data', chatEntry)
      // 자기 자신에게는 메시지를 전송하지 않음
      sendPushNotification(username, message);
  });

  socket.on('disconnect', () => {
      console.log('A user disconnected');
  });
});

//프로필 사진 처리
// 프로필 사진 업로드 처리
app.post('/upload-profile', upload.single('profilePicture'), (req, res) => {
  const username = req.session.user;
  if (!username) {
      return res.status(401).send('Unauthorized');
  }

  // 업로드된 파일 경로 저장
  const profilePath = `/uploads/${req.file.filename}`;
  const user = users.find((u) => u.username === username);
  if (user) {
      user.profilePicture = profilePath;
      saveUsers();
      return res.status(200).json({ profilePicture: profilePath });
  }

  res.status(404).send('User not found');
});
// Start server
server.listen(80, () => {
  console.log('Server is running on http://localhost');
});
