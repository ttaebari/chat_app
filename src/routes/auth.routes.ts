import express from "express";
import { registerUser } from "../controllers/auth.controller";

const router = express.Router();

// 📌 회원가입 라우트
router.post("/register", registerUser);

export default router;
