import { Request, Response } from "express";
import pool from "../config/database";

export const handleAuth = async (req: Request, res: Response): Promise<void> => {
    const { username, password, action } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: "아이디와 비밀번호를 입력하세요." });
        return;
    }

    try {
        const [userRows]: any = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

        if (action === "login") {
            if (userRows.length === 0) {
                res.json({ error: "가입되지 않은 아이디입니다." });
                return;
            }

            const user = userRows[0];
            if (user.password !== password) {
                res.json({ error: "비밀번호가 다릅니다." });
                return;
            }

            req.session.userId = user.id;
            res.json({ success: "로그인 성공!", redirect: "/chat.html" });
            return;

        } else if (action === "register") {
            if (userRows.length > 0) {
                res.json({ error: "이미 가입한 아이디입니다." });
                return;
            }

            await pool.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);

            const [newUser]: any = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
            req.session.userId = newUser[0].id;

            res.json({ success: "가입에 성공했습니다!", redirect: "/chat.html" });
            return;
        }
    } catch (error) {
        console.error("❌ 인증 처리 오류:", error);
        res.status(500).json({ error: "서버 오류 발생" });
        return;
    }
};
