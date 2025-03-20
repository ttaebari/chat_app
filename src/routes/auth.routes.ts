import express from "express";
import { handleAuth } from "../controllers/auth.controller";

const router = express.Router();

router.post("/auth", handleAuth); 

export default router;
