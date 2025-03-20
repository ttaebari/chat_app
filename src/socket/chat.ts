import { Server } from "socket.io";
import pool from "../config/database";
import { Session } from "express-session";

declare module "http" {
    interface IncomingMessage {
        session?: Session & { userId?: number };
    }
}

export const users: { [userId: number]: { socketId: string; username: string } } = {};

export function setupChat(io: Server) {
    io.on("connection", async (socket) => {
        const userId = socket.request.session?.userId;
        if (!userId) {
            socket.disconnect();
            return;
        }

        try {
            const [user]: any = await pool.query("SELECT username FROM users WHERE id = ?", [userId]);
            if (user.length === 0) {
                socket.disconnect();
                return;
            }

            const username = user[0].username;
            users[userId] = { socketId: socket.id, username };

            io.emit("update users", Object.values(users).map(user => user.username));

            io.emit("chat message", { username: "알림", message: `${username}님이 입장하셨습니다.` });

            socket.on("chat message", (message) => {
                io.emit("chat message", { username, message });
            });

            // 🔥 DM 방 입장
            socket.on("join dm", (toUser) => {
                console.log(`📌 ${socket.id}가 ${toUser}와의 DM에 입장`);
                socket.join(`dm-${toUser}`);
            });

            // 🔥 DM 메시지 전송
            socket.on("send dm", ({ to, message, from }) => {
                console.log(`📨 DM 전송 요청 → 받는 사람: ${to}, 메시지: ${message}, 보낸 사람: ${from}`);

                // 🔥 대상 사용자가 참여 중인 DM 방에 메시지 전송
                io.to(`dm-${to}`).emit("dm message", { from, message });

                // 🔥 메시지를 보낸 본인에게도 추가 표시 (실시간 반영)
                socket.emit("dm message", { from, message });
            });
            socket.on("dm message", (message) => {
                io.emit("dm message", { username, message });
            });

            // 🔥 클라이언트 연결 해제
            socket.on("disconnect", () => {
                console.log(`❌ 사용자 연결 종료: ${socket.id}`);
            });

        } catch (error) {
            socket.disconnect();
        }
    });
}
