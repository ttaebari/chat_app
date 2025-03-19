import { Request, Response } from 'express';
import pool from '../config/database';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).send("아이디와 비밀번호를 입력하세요!");
        return;
    }

    try {
        // 🔥 사용자 저장
        await pool.query(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            [username, password]
        );

        // 🔥 새로 생성된 userId 가져오기
        const [user]: any = await pool.query("SELECT id FROM users WHERE username = ?", [username]);

        if (user.length > 0) {
            req.session.userId = user[0].id; // 🔥 세션에 userId 저장
            req.session.save(() => { // 🔥 세션을 강제로 저장
                res.redirect('/chat');
            });
        } else {
            res.status(500).send("회원가입 후 userId 조회 실패");
        }
    } catch (error) {
        console.error("회원가입 오류:", error);
        res.status(500).send("서버 오류 발생");
    }
};
