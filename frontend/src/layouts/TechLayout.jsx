// frontend/src/layouts/TechLayout.jsx

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

import {
  LayoutDashboard,
  Ticket,
  Bell,
  LogOut,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { Link } from "react-router-dom";


export default function TechLayout() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { unreadCount } = useNotifications();


  // ✅ GET LOGGED-IN USER
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ✅ LOGOUT FUNCTION
  const handleLogout = () => {
    logout();
    navigate("/login"); // redirect
  };

  // ✅ ACTIVE LINK STYLE
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
        {/* LOGO */}
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              Technician<span className="text-indigo-600">Panel</span>
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Technician Menu
          </p>

          <NavLink to="/tech/dashboard" className={navItemClass}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>

          <NavLink to="/tech/tickets" className={navItemClass}>
            <Ticket className="w-5 h-5" />
            Assigned Tickets
          </NavLink>

          <NavLink to="/tech/notifications" className={navItemClass}>
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            Notifications
          </NavLink>


          <NavLink to="/tech/profile" className={navItemClass}>
            <Settings className="w-5 h-5" />
            Profile Settings
          </NavLink>
        </nav>

        {/* ✅ PROFILE + LOGOUT */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
            {/* PROFILE IMAGE */}
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
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
            )}

            {/* NAME */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {user?.name || "Tech User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || "tech@email.com"}
              </p>
            </div>
          </div>

          {/* LOGOUT BUTTON */}
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
              {user?.name || "Technician"}
            </span>
          </h1>

          <Link
            to="/tech/notifications"
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
