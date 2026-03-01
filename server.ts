import express from "express";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./src/database.ts";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-gym-key";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    next();
  };

  // --- API Routes ---
  app.get("/api/health", async (req, res) => {
    try {
      const userCount = await db.getOne('SELECT COUNT(*) as count FROM users');
      res.json({ status: "ok", db: "connected", users: userCount.count });
    } catch (e) {
      res.status(500).json({ status: "error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      // Usiamo $1, $2 per Postgres e RETURNING id per ottenere l'ID inserito
      const result = await db.run(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id', 
        [name, email, hashedPassword]
      );
      // Correzione errore TS2339: accediamo all'id in modo sicuro per Postgres
      res.json({ id: (result as any).id || (result as any).lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.getOne('SELECT * FROM users WHERE email = $1', [email]);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/members/profile", authenticate, async (req: any, res) => {
    const user = await db.getOne('SELECT id, name, email, role, subscription_plan, subscription_status, subscription_end_date, fitness_goals FROM users WHERE id = $1', [req.user.id]);
    res.json(user);
  });

  app.get("/api/members", authenticate, isAdmin, async (req, res) => {
    const members = await db.getAll('SELECT id, name, email, role, subscription_plan, subscription_status FROM users');
    res.json(members);
  });

  app.get("/api/classes", authenticate, async (req, res) => {
    const classes = await db.getAll(`
      SELECT c.*, u.name as instructor_name, 
      (SELECT COUNT(*) FROM bookings WHERE class_id = c.id AND status = 'booked') as current_bookings
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
    `);
    res.json(classes);
  });

  // --- Gestione Produzione (Static Files) ---
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
