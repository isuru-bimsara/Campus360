import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  LayoutDashboard,
  CalendarCheck,
  Box,
  Ticket,
  Bell,
  LogOut,
  UserCircle,
  Settings,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { Link } from "react-router-dom";


export default function UserLayout() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { unreadCount } = useNotifications();


  // Fetch logged-in user once
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        updateUser(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Active link style
  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      isActive
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
    }`;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Box className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              Reserva<span className="text-indigo-600">Hub</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Main Menu
          </p>

          <NavLink to="/user/dashboard" className={navItemClass}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-semibold">Dashboard</span>
          </NavLink>

          <NavLink to="/user/bookings" className={navItemClass}>
            <CalendarCheck className="w-5 h-5" />
            <span className="font-semibold">My Bookings</span>
          </NavLink>

          <NavLink to="/user/resources" className={navItemClass}>
            <Box className="w-5 h-5" />
            <span className="font-semibold">Resources</span>
          </NavLink>

          <NavLink to="/user/tickets" className={navItemClass}>
            <Ticket className="w-5 h-5" />
            <span className="font-semibold">My Tickets</span>
          </NavLink>

          <NavLink to="/user/notifications" className={navItemClass}>
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="font-semibold">Notifications</span>
          </NavLink>


          <NavLink to="/user/profile" className={navItemClass}>
            <Settings className="w-5 h-5" />
            <span className="font-semibold">Profile Settings</span>
          </NavLink>
        </nav>

        {/* Profile + Logout */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
            {user?.picture ? (
              <img
                src={
                  user.picture?.startsWith("http")
                    ? user.picture
                    : `http://localhost:8083${user.picture}`
                }
                alt="profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="w-10 h-10 text-slate-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || "you@example.com"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-semibold hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h1 className="text-slate-500 font-medium">
            Welcome,{" "}
            <span className="text-slate-800 font-bold">
              {user?.name || "User"}
            </span>
          </h1>
          <Link
            to="/user/notifications"
            className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

        </header>

        {/* CONTENT */}
        <section className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
