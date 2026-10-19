import express from "express";
import cors from "cors";
import roomRoutes from "./routes/room.routes.js";
import songRoutes from "./routes/song.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Jam API is running",
  });
});

app.use("/api/rooms", roomRoutes);
app.use("/api/songs", songRoutes);

export default app;