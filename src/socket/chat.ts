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

            //chat socket
            socket.on("chat message", (message) => {
                io.emit("chat message", { username, message });
            });

            socket.on("disconnect", () => {
                console.log(` 사용자 연결 종료: ${socket.id}`);
            });

        } catch (error) {
            socket.disconnect();
        }
    });
}
