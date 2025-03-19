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

            // 🔥 DM 방 참가
            socket.on("join dm", (toUsername) => {
                const toUser = Object.values(users).find(user => user.username === toUsername);
                if (!toUser) return;
                socket.join(`dm-${toUser.socketId}`);
            });

            // 🔥 DM 메시지 전송
            socket.on("send dm", ({ to, message }) => {
                const toUser = Object.values(users).find(user => user.username === to);
                if (!toUser) return;

                io.to(`dm-${toUser.socketId}`).emit("dm message", { from: username, message });
            });

            socket.on("disconnect", () => {
                delete users[userId];

                io.emit("update users", Object.values(users).map(user => user.username));
                io.emit("chat message", { username: "알림", message: `${username}님이 나갔습니다.` });
            });

        } catch (error) {
            socket.disconnect();
        }
    });
}
