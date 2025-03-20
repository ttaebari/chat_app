import express from "express";
import { handleAuth } from "../controllers/auth.controller";

const router = express.Router();

router.post("/auth", handleAuth); // 🔥 이제 정상 작동!

export default router;
