import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const { hostName } = req.body;

  if (!hostName) {
    return res.status(400).json({
      success: false,
      message: "Host name is required",
    });
  }

  const room = {
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    hostName,
  };

  res.status(201).json({
    success: true,
    room,
  });
});

export default router;