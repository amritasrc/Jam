import express, { Request, Response } from "express";
import cors from 'cors';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Jam API is running"
  });
});

export default app;