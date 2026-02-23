import express from "express";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./src/database.ts";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-gym-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // --- Health Check ---
  app.get("/api/health", async (req, res) => {
    try {
      const userCount = await db.getOne('SELECT COUNT(*) as count FROM users');
      res.json({ status: "ok", users: userCount.count });
    } catch (e) {
      res.status(500).json({ status: "error" });
    }
  });

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  });

  // --- Member Routes ---
  app.get("/api/members/profile", authenticate, async (req: any, res) => {
    const user = await db.getOne('SELECT id, name, email, role, subscription_plan, subscription_status, subscription_end_date, fitness_goals FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  });

  app.get("/api/members", authenticate, isAdmin, async (req, res) => {
    const members = await db.getAll('SELECT id, name, email, role, subscription_plan, subscription_status FROM users');
    res.json(members);
  });

  // --- Class Routes ---
  app.get("/api/classes", authenticate, async (req, res) => {
    const classes = await db.getAll(`
      SELECT c.*, u.name as instructor_name, 
      (SELECT COUNT(*) FROM bookings WHERE class_id = c.id AND status = 'booked') as current_bookings
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
    `);
    res.json(classes);
  });

  app.post("/api/classes/book", authenticate, async (req: any, res) => {
    const { classId } = req.body;
    const userId = req.user.id;
    
    const cls = await db.getOne('SELECT capacity, (SELECT COUNT(*) FROM bookings WHERE class_id = ? AND status = "booked") as current FROM classes WHERE id = ?', [classId, classId]);
    
    if (cls.current >= cls.capacity) {
      await db.run('INSERT INTO bookings (user_id, class_id, status) VALUES (?, ?, ?)', [userId, classId, 'waitlist']);
      return res.json({ message: "Added to waitlist" });
    }

    await db.run('INSERT INTO bookings (user_id, class_id) VALUES (?, ?)', [userId, classId]);
    res.json({ message: "Booked successfully" });
  });

  app.get("/api/my-bookings", authenticate, async (req: any, res) => {
    const bookings = await db.getAll(`
      SELECT b.*, c.name as class_name, c.schedule_day, c.schedule_time
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      WHERE b.user_id = ?
    `, [req.user.id]);
    res.json(bookings);
  });

  // --- Attendance ---
  app.post("/api/attendance/check-in", authenticate, async (req: any, res) => {
    await db.run('INSERT INTO attendance (user_id) VALUES (?)', [req.user.id]);
    res.json({ message: "Checked in successfully" });
  });

  app.post("/api/attendance/generate-disposable", authenticate, async (req: any, res) => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.run('INSERT INTO disposable_tokens (user_id, token) VALUES (?, ?)', [req.user.id, token]);
    res.json({ token });
  });

  app.post("/api/attendance/check-in-disposable", async (req, res) => {
    const { token } = req.body;
    const disposable = await db.getOne('SELECT * FROM disposable_tokens WHERE token = ? AND used = 0', [token]);
    
    if (!disposable) {
      return res.status(400).json({ error: "Invalid or already used token" });
    }

    await db.run('UPDATE disposable_tokens SET used = 1 WHERE id = ?', [disposable.id]);
    await db.run('INSERT INTO attendance (user_id) VALUES (?)', [disposable.user_id]);
    res.json({ message: "Disposable check-in successful" });
  });

  // --- Analytics (Admin) ---
  app.get("/api/admin/stats", authenticate, isAdmin, async (req, res) => {
    const totalMembers = await db.getOne('SELECT COUNT(*) as count FROM users WHERE role = "member"');
    const activeSubscriptions = await db.getOne('SELECT COUNT(*) as count FROM users WHERE subscription_status = "active"');
    const totalRevenue = await db.getOne('SELECT SUM(amount) as total FROM payments WHERE status = "paid"');
    const recentAttendance = await db.getOne('SELECT COUNT(*) as count FROM attendance WHERE check_in_time > date("now", "-1 day")');

    res.json({
      totalMembers: totalMembers.count,
      activeSubscriptions: activeSubscriptions.count,
      totalRevenue: totalRevenue.total || 0,
      recentAttendance: recentAttendance.count
    });
  });

  // --- Seed Data ---
  const userCount = await db.getOne('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('FRENKYFIT: Seeding initial data...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const memberPassword = await bcrypt.hash('member123', 10);
    
    await db.run('INSERT INTO users (name, email, password, role, subscription_plan, subscription_status) VALUES (?, ?, ?, ?, ?, ?)', 
      ['Admin User', 'admin@frenkyfit.com', adminPassword, 'admin', 'annual', 'active']);
    await db.run('INSERT INTO users (name, email, password, role, subscription_plan, subscription_status, fitness_goals) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      ['John Doe', 'member@frenkyfit.com', memberPassword, 'member', 'monthly', 'active', 'Lose 5kg and build muscle']);
    
    await db.run('INSERT INTO classes (name, type, schedule_day, schedule_time) VALUES (?, ?, ?, ?)', ['Yoga Flow', 'yoga', 'Monday', '08:00']);
    await db.run('INSERT INTO classes (name, type, schedule_day, schedule_time) VALUES (?, ?, ?, ?)', ['Spin Blast', 'spinning', 'Tuesday', '18:00']);
    
    await db.run('INSERT INTO payments (user_id, amount, status, plan) VALUES (?, ?, ?, ?)', [1, 499.99, 'paid', 'annual']);
    await db.run('INSERT INTO payments (user_id, amount, status, plan) VALUES (?, ?, ?, ?)', [2, 49.99, 'paid', 'monthly']);
    console.log('FRENKYFIT: Seeding complete.');
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FRENKYFIT Server started on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
