import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { bookingsApi } from "../../api/bookings";
import { format, isToday, isTomorrow } from "date-fns";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  X,
  ChevronRight,
  User,
  Box,
  AlertCircle,
  ArrowRight,
  Calendar,
  Hash,
  MessageSquare,
  History
} from "lucide-react";

const STATUS_THEME = {
  APPROVED: { 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    banner: "bg-emerald-600",
    light: "bg-emerald-50",
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  PENDING: { 
    color: "bg-amber-50 text-amber-700 border-amber-200", 
    banner: "bg-amber-500",
    light: "bg-amber-50",
    icon: <Clock className="w-4 h-4" /> 
  },
  REJECTED: { 
    color: "bg-rose-50 text-rose-700 border-rose-200", 
    banner: "bg-rose-600",
    light: "bg-rose-50",
    icon: <XCircle className="w-4 h-4" /> 
  },
  CANCELLED: { 
    color: "bg-slate-100 text-slate-500 border-slate-200", 
    banner: "bg-slate-500",
    light: "bg-slate-100",
    icon: <AlertCircle className="w-4 h-4" /> 
  },
};

export default function OpsBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: "" });

  const fetchBookings = async () => {
    try {
      const res = await bookingsApi.getAll();
      const data = (res.data.data || []).map((b) => {
        if (new Date(b.endTime) < new Date() && b.status === "PENDING") {
          return { ...b, status: "CANCELLED", autoCancelled: true };
        }
        return b;
      });
      setBookings(data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const bookingId = searchParams.get("bookingId");
    if (bookingId && bookings.length > 0) {
      const b = bookings.find((item) => String(item.id) === String(bookingId));
      if (b) setSelectedBooking(b);
    }
  }, [searchParams, bookings]);

  const handleAction = async (id, action, reason = "") => {
    setActionLoading(id + action);
    try {
      let res;
      if (action === "approve") res = await bookingsApi.approve(id);
      else if (action === "reject") res = await bookingsApi.reject(id, reason);
      else if (action === "cancel") res = await bookingsApi.cancel(id);

      const updated = res.data.data;
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      if (selectedBooking?.id === id) setSelectedBooking(updated);
      setRejectModal({ open: false, id: null, reason: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.resourceName?.toLowerCase().includes(search.toLowerCase()) || 
                          b.userName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    if (isToday(d)) return `Today at ${format(d, "p")}`;
    if (isTomorrow(d)) return `Tomorrow at ${format(d, "p")}`;
    return format(d, "MMM dd, p");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      <p className="text-slate-500 font-bold tracking-tight">Syncing Reservations...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* TOP NAVBAR AREA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
            <CalendarCheck className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Booking Manager</h1>
            <p className="text-indigo-100 font-medium">Identify and process reservations in real-time</p>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search resources or users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full lg:w-80 pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder:text-indigo-200 outline-none focus:bg-white/20 focus:border-white/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-6 py-2.5 rounded-full text-xs font-black tracking-widest transition-all whitespace-nowrap border-2 ${
              statusFilter === key 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                : "bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-600"
            }`}
          >
            {key} {key !== "ALL" && `(${bookings.filter(b => b.status === key).length})`}
          </button>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Resource Identity</th>
              <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Requester</th>
              <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
              <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredBookings.map((b) => (
              <tr 
                key={b.id} 
                onClick={() => setSelectedBooking(b)}
                className="group hover:bg-indigo-50/30 cursor-pointer transition-all"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                      <Box className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="font-bold text-slate-800 text-base">{b.resourceName}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {b.userName.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{b.userName}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">{formatTime(b.startTime)}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-tighter">
                      <ArrowRight className="w-3 h-3" /> Ends {formatTime(b.endTime)}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${STATUS_THEME[b.status]?.color}`}>
                    {STATUS_THEME[b.status]?.icon}
                    {b.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CENTERED DETAIL MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-indigo-900/40 backdrop-blur-md transition-opacity" 
            onClick={() => setSelectedBooking(null)} 
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Status-colored Header Banner */}
            <div className={`px-10 py-12 ${STATUS_THEME[selectedBooking.status]?.banner} text-white relative`}>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30">
                  <Box className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedBooking.resourceName}</h2>
                  <div className="flex items-center gap-2 mt-2 opacity-90">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-widest">Booking ID #{selectedBooking.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50">
              <div className="space-y-6">
                <DetailRow icon={<User />} label="Requested Personnel" value={selectedBooking.userName} />
                <DetailRow icon={<Calendar />} label="Reservation Date" value={format(new Date(selectedBooking.startTime), "EEEE, MMMM dd")} />
                <div className="flex items-center gap-4">
                   <DetailRow icon={<Clock />} label="Check-In" value={format(new Date(selectedBooking.startTime), "hh:mm a")} />
                   <DetailRow icon={<ArrowRight />} label="Check-Out" value={format(new Date(selectedBooking.endTime), "hh:mm a")} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Purpose</span>
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    "{selectedBooking.purpose || "The requester has not specified a purpose."}"
                  </p>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-xs font-bold px-2">
                   <History className="w-4 h-4" />
                   <span>Generated on {format(new Date(selectedBooking.createdAt), "PPp")}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Footer Actions */}
            <div className="p-8 border-t border-slate-100 flex gap-4 bg-white">
              {selectedBooking.status === "PENDING" && (
                <>
                  <button 
                    onClick={() => handleAction(selectedBooking.id, "approve")}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95"
                  >
                    CONFIRM & APPROVE
                  </button>
                  <button 
                    onClick={() => setRejectModal({ open: true, id: selectedBooking.id, reason: "" })}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95"
                  >
                    DECLINE REQUEST
                  </button>
                </>
              )}
              {selectedBooking.status === "APPROVED" && (
                <button 
                  onClick={() => handleAction(selectedBooking.id, "cancel")}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  CLOSE THE REQUEST
                </button>
              )}
         
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL (Centered) */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-rose-900/30 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Reason for Decline</h3>
            <p className="text-slate-500 mb-6 font-medium leading-snug">Please provide a brief explanation. This feedback will be sent directly to the requester.</p>
            
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Double booking or maintenance required..."
              rows={4}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-rose-500 focus:bg-white transition-all text-sm mb-6 resize-none"
            />
            
            <div className="flex gap-4">
              <button onClick={() => setRejectModal({ open: false, id: null, reason: "" })} className="flex-1 font-bold text-slate-400">Back</button>
              <button 
                disabled={!rejectModal.reason.trim()} 
                onClick={() => handleAction(rejectModal.id, "reject", rejectModal.reason)}
                className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 disabled:opacity-50 transition-all"
              >
                SUBMIT & REJECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal Detail Component for Modal
function DetailRow({ icon, label, value }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 p-2 bg-white rounded-xl border border-slate-200 text-indigo-500 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}