/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Calendar, 
  User, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle, 
  TrendingUp, 
  Utensils,
  Settings,
  ShieldCheck,
  Menu,
  X,
  CreditCard,
  QrCode,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  role: 'member' | 'trainer' | 'admin';
  subscription_plan?: string;
  subscription_status?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('gym_user');
    const token = localStorage.getItem('gym_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('gym_token', token);
    localStorage.setItem('gym_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('gym_token');
    localStorage.removeItem('gym_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, to, active }: { icon: any, label: string, to: string, active?: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Dumbbell className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">FRENKY<span className="text-orange-500">FIT</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <span className="text-zinc-400 text-sm">Welcome back, <span className="text-white font-medium">{user?.name}</span></span>
          <button onClick={logout} className="text-zinc-400 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-zinc-950 border-b border-zinc-800 p-4 flex flex-col gap-2"
          >
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
            <SidebarItem icon={Calendar} label="Classes" to="/classes" />
            <SidebarItem icon={Dumbbell} label="Workouts" to="/workouts" />
            <SidebarItem icon={Utensils} label="Nutrition" to="/nutrition" />
            <SidebarItem icon={User} label="Profile" to="/profile" />
            {user?.role === 'admin' && <SidebarItem icon={ShieldCheck} label="Admin" to="/admin" />}
            <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <div className="flex max-w-7xl mx-auto">
        <aside className="hidden md:flex flex-col w-64 p-6 gap-2 border-r border-zinc-900 h-[calc(100vh-64px)] sticky top-16">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
          <SidebarItem icon={Calendar} label="Classes" to="/classes" />
          <SidebarItem icon={Dumbbell} label="Workouts" to="/workouts" />
          <SidebarItem icon={Utensils} label="Nutrition" to="/nutrition" />
          <SidebarItem icon={User} label="Profile" to="/profile" />
          {user?.role === 'admin' && (
            <>
              <div className="mt-6 mb-2 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Admin</div>
              <SidebarItem icon={ShieldCheck} label="Management" to="/admin" />
              <SidebarItem icon={TrendingUp} label="Analytics" to="/admin/analytics" />
            </>
          )}
        </aside>
        <main className="flex-1 p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Pages ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch (err) {
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serverStatus === 'offline') {
      alert('The server appears to be offline. Please wait a moment and try again.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.token, data.user);
        navigate('/');
      } else {
        alert(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Unable to connect to the server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Server Status Indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            serverStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 
            serverStatus === 'offline' ? 'bg-red-500' : 'bg-zinc-600 animate-pulse'
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {serverStatus === 'online' ? 'Server Online' : serverStatus === 'offline' ? 'Server Offline' : 'Checking...'}
          </span>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-500 p-3 rounded-2xl mb-4">
            <Dumbbell className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">FRENKY<span className="text-orange-500">FIT</span></h1>
          <p className="text-zinc-400 mt-2">Enter your credentials to access the gym</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white"
              placeholder="admin@frenkyfit.com"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white"
              placeholder="admin123"
              required
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || serverStatus === 'offline'}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <p className="text-center text-zinc-500 text-sm">
            Don't have an account? <Link to="/register" className="text-orange-500 hover:underline font-medium">Register here</Link>
          </p>
          <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 text-center">Demo Credentials</p>
            <div className="flex justify-around text-xs">
              <div className="text-center">
                <p className="text-zinc-400">Admin</p>
                <p className="text-white font-mono">admin@frenkyfit.com</p>
                <p className="text-zinc-500">admin123</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-400">Member</p>
                <p className="text-white font-mono">member@frenkyfit.com</p>
                <p className="text-zinc-500">member123</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const data = [
    { name: 'Mon', calories: 2100 },
    { name: 'Tue', calories: 2400 },
    { name: 'Wed', calories: 1800 },
    { name: 'Thu', calories: 2200 },
    { name: 'Fri', calories: 2600 },
    { name: 'Sat', calories: 2000 },
    { name: 'Sun', calories: 1900 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Track your progress and upcoming activities.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
              <Calendar size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Next Class</span>
          </div>
          <h3 className="text-xl font-bold">Yoga Flow</h3>
          <p className="text-zinc-400 text-sm">Today, 08:00 AM</p>
          <button className="mt-4 text-sm text-blue-500 hover:underline font-medium">View Schedule</button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
              <Dumbbell size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Workout Plan</span>
          </div>
          <h3 className="text-xl font-bold">Push Day A</h3>
          <p className="text-zinc-400 text-sm">45 mins • 8 exercises</p>
          <button className="mt-4 text-sm text-orange-500 hover:underline font-medium">Start Session</button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Streak</span>
          </div>
          <h3 className="text-xl font-bold">5 Days</h3>
          <p className="text-zinc-400 text-sm">Keep it up! You're on fire.</p>
          <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-4/5"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-6">Calorie Intake</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Line type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { title: 'Checked in at Main Gym', time: '2 hours ago', icon: CheckCircle, color: 'text-emerald-500' },
              { title: 'Completed Spin Blast', time: 'Yesterday', icon: Dumbbell, color: 'text-orange-500' },
              { title: 'Subscription Renewed', time: '3 days ago', icon: CreditCard, color: 'text-blue-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-zinc-800/50 rounded-2xl transition-colors">
                <div className={`${item.color} bg-zinc-800 p-2 rounded-xl`}>
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-zinc-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Classes = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/classes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('gym_token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setClasses(data);
      setLoading(false);
    });
  }, []);

  const bookClass = async (id: number) => {
    const res = await fetch('/api/classes/book', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gym_token')}`
      },
      body: JSON.stringify({ classId: id })
    });
    const data = await res.json();
    alert(data.message);
    // Refresh
    const fresh = await fetch('/api/classes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('gym_token')}` }
    }).then(r => r.json());
    setClasses(fresh);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Classes</h1>
          <p className="text-zinc-400 mt-1">Book your spot in our upcoming sessions.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">Filter</button>
          <button className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">Calendar View</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <p>Loading classes...</p>
        ) : classes.map((cls) => (
          <motion.div 
            key={cls.id}
            whileHover={{ y: -5 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group"
          >
            <div className="h-40 bg-zinc-800 relative">
              <img 
                src={`https://picsum.photos/seed/${cls.type}/800/400`} 
                alt={cls.name}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
                {cls.type}
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <span className="text-xs text-zinc-500 font-medium">{cls.current_bookings}/{cls.capacity} Booked</span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Calendar size={14} />
                  <span>{cls.schedule_day} • {cls.schedule_time}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <User size={14} />
                  <span>{cls.instructor_name || 'TBA'}</span>
                </div>
              </div>
              <button 
                onClick={() => bookClass(cls.id)}
                className="w-full bg-zinc-800 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Book Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [disposableToken, setDisposableToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/members/profile', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('gym_token')}` }
    })
    .then(res => res.json())
    .then(data => setProfile(data));
  }, []);

  const generateDisposableToken = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/attendance/generate-disposable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gym_token')}` }
      });
      const data = await res.json();
      setDisposableToken(data.token);
    } catch (err) {
      console.error('Error generating token:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
        <p className="text-zinc-400 mt-1">Manage your account and subscription.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                {profile.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-zinc-400">{profile.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
                    {profile.role}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                    profile.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {profile.subscription_status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Full Name</label>
                <p className="bg-zinc-800/50 p-3 rounded-xl text-zinc-300">{profile.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Email Address</label>
                <p className="bg-zinc-800/50 p-3 rounded-xl text-zinc-300">{profile.email}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-500 mb-1">Fitness Goals</label>
                <p className="bg-zinc-800/50 p-3 rounded-xl text-zinc-300 italic">
                  {profile.fitness_goals || "No goals set yet. Update your profile to add them."}
                </p>
              </div>
            </div>
            
            <button className="mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
              Edit Profile
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-6">Subscription Details</h3>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-zinc-400 text-sm">Current Plan</p>
                <p className="text-xl font-bold capitalize">{profile.subscription_plan || 'No Plan'}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Next Billing Date</p>
                <p className="text-xl font-bold">{profile.subscription_end_date || 'N/A'}</p>
              </div>
              <div className="flex gap-2">
                <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all">
                  Upgrade
                </button>
                <button className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all">
                  Manage
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center">
            <h3 className="text-lg font-bold mb-4">Single-use Pass</h3>
            <div className="bg-white p-4 rounded-2xl mb-4 min-h-[192px] flex items-center justify-center">
              {disposableToken ? (
                <QRCodeSVG value={`disposable-${disposableToken}`} size={160} />
              ) : (
                <div className="text-zinc-400 text-xs px-4">
                  Generate a one-time QR code for a single entry.
                </div>
              )}
            </div>
            <button 
              onClick={generateDisposableToken}
              disabled={isGenerating}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <QrCode size={18} />
              <span>{isGenerating ? 'Generating...' : 'Generate New Pass'}</span>
            </button>
            {disposableToken && (
              <p className="mt-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                Valid for one entry only
              </p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center">
            <h3 className="text-lg font-bold mb-4">Digital Key</h3>
            <div className="bg-white p-4 rounded-2xl mb-4">
              <QRCodeSVG value={`gym-member-${profile.id}`} size={160} />
            </div>
            <p className="text-sm text-zinc-400">Scan this code at the gym entrance to check in.</p>
            <button className="mt-6 flex items-center gap-2 text-orange-500 font-bold hover:underline">
              <QrCode size={18} />
              <span>Add to Apple Wallet</span>
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm">
                <span>Freeze Membership</span>
                <Settings size={16} className="text-zinc-500" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm">
                <span>Payment Methods</span>
                <CreditCard size={16} className="text-zinc-500" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm text-red-400">
                <span>Cancel Membership</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminManagement = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('gym_token');
    fetch('/api/members', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMembers(data));
    
    fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Management</h1>
          <p className="text-zinc-400 mt-1">Admin control panel for gym operations.</p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2">
          <Plus size={20} />
          <span>Add Member</span>
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Members', value: stats.totalMembers, color: 'text-blue-500' },
            { label: 'Active Subs', value: stats.activeSubscriptions, color: 'text-emerald-500' },
            { label: 'Monthly Revenue', value: `$${stats.totalRevenue}`, color: 'text-orange-500' },
            { label: 'Daily Check-ins', value: stats.recentAttendance, color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold">Member Directory</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search members..." 
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-xs font-bold uppercase tracking-widest border-b border-zinc-800">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{m.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{m.email}</td>
                  <td className="px-6 py-4 capitalize">{m.subscription_plan || 'None'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                      m.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {m.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-zinc-400 hover:text-white transition-colors mr-3">Edit</button>
                    <button className="text-red-400 hover:text-red-300 transition-colors">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (loginData.token) {
          login(loginData.token, loginData.user);
          navigate('/');
        }
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-500 p-3 rounded-2xl mb-4">
            <Dumbbell className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">FRENKY<span className="text-orange-500">FIT</span></h1>
          <p className="text-zinc-400 mt-2">Create your account to start training</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white"
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white"
              placeholder="name@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <p className="text-center text-zinc-500 mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-orange-500 hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminManagement /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
