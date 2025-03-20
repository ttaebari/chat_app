import express from 'express';
import http from 'http';
import session from 'express-session';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import pool from "./config/database"; 
import { setupChat, users } from "./socket/chat"; 


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true 
    }
});

// 세션 미들웨어 설정
const sessionMiddleware = session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
});

// Express에 세션 적용
app.use(sessionMiddleware);

// JSON 데이터 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 회원가입 & 로그인 라우트
app.use('/login', authRoutes);

// 채팅방 페이지 (`chat.html`)
app.get('/chat', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// 유저 목록 페이지 (`users.html`)
app.get('/users', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../public/users.html'));
});

//  Socket.io와 세션 공유
io.use((socket, next) => {
    sessionMiddleware(socket.request as express.Request, {} as express.Response, (err?: any) => {
        if (err) {
            return next(new Error(err));
        }
        next();
    });
});

//user 목록
const getConnectedUsers = async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    try {
        const [userRows]: any = await pool.query("SELECT username FROM users WHERE id = ?", [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: "유저 정보를 찾을 수 없습니다." });
        }

        const currentUsername: string = userRows[0].username;

        // 실시간으로 업데이트된 최신 users 목록을 반환
        const otherUsers = Object.values(users)
            .filter(user => user.username !== currentUsername)
            .map(user => user.username);


        return res.json({ users: otherUsers });

    } catch (error) {
        console.error(" 유저 목록 불러오기 오류:", error);
        return res.status(500).json({ error: "서버 오류 발생" });
    }
};

// 접속한 유저 목록 반환
app.get('/connected-users', getConnectedUsers);


//  소켓 서버 실행
setupChat(io);

//  서버 실행
const PORT = process.env.PORT || 3370;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
