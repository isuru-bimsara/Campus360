import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ticketsApi } from "../../api/tickets";
import { useAuth } from "../../context/AuthContext";
import TicketComments from "../TicketComments";
import {
  MessageSquare,
  CheckCircle2,
  UserCheck,
  ClipboardList,
  ChevronRight,
  Loader2,
  X,
  ArrowRightCircle,
  RefreshCcw,
  Eye,
  CalendarDays,
  User,
  AlertTriangle,
  Clock3,
  Image as ImageIcon,
  BadgeCheck,
  CircleDot,
} from "lucide-react";

/**
 * Industry-style technician workspace:
 * - Always shows MY_ACTIVE by default.
 * - Click a ticket card to open full detail drawer/modal.
 * - Resolve button moved into detail box (as requested).
 * - Workflow:
 *   OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
 */
export default function TechTickets() {
  const { user } = useAuth();
  const myId = Number(user?.id);

  const [tickets, setTickets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeTab, setActiveTab] = useState("ALL");

  const [commentOpen, setCommentOpen] = useState(false);
  const [commentTicketId, setCommentTicketId] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Resolve form inside detail box
  const [resolveForm, setResolveForm] = useState({
    explanation: "",
    internalNotes: "",
  });

  const [searchParams] = useSearchParams();
  const ticketIdFromQuery = searchParams.get("ticketId");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await ticketsApi.getAll();
      setTickets(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      setTickets([]);
      setFetchError(err?.response?.data?.message || "Failed to load tickets.");
    } finally {
      setFetching(false);
    }
  };

  // Notification deep-link handling
  useEffect(() => {
    if (!ticketIdFromQuery || !tickets.length) return;
    const idNum = Number(ticketIdFromQuery);
    if (Number.isNaN(idNum)) return;

    const t = tickets.find((x) => Number(x.id) === idNum);
    if (!t) return;

    // If assigned to me, focus corresponding tab
    if (Number(t.assigneeId) === myId) {
      if (t.status === "IN_PROGRESS") setActiveTab("MY_ACTIVE");
      else if (t.status === "RESOLVED") setActiveTab("RESOLVED");
      else if (t.status === "CLOSED") setActiveTab("CLOSED");
    } else if (!t.assigneeId && t.status === "OPEN") {
      setActiveTab("AVAILABLE");
    }

    openTicketDetails(t);
  }, [ticketIdFromQuery, tickets, myId]);

  const sortNewestFirst = (items) =>
    [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const filteredTickets = useMemo(() => {
    switch (activeTab) {
      case "ALL":
        return sortNewestFirst(tickets);
      case "AVAILABLE":
        return sortNewestFirst(tickets.filter((t) => !t.assigneeId && t.status === "OPEN"));
      case "MY_ACTIVE":
        return sortNewestFirst(
          tickets.filter(
            (t) => Number(t.assigneeId) === myId && t.status === "IN_PROGRESS"
          )
        );
      case "RESOLVED":
        return sortNewestFirst(
          tickets.filter(
            (t) => Number(t.assigneeId) === myId && t.status === "RESOLVED"
          )
        );
      case "CLOSED":
        return sortNewestFirst(
          tickets.filter(
            (t) => Number(t.assigneeId) === myId && t.status === "CLOSED"
          )
        );
      default:
        return [];
    }
  }, [tickets, activeTab, myId]);

  const counts = useMemo(() => {
    const available = tickets.filter((t) => !t.assigneeId && t.status === "OPEN").length;
    const active = tickets.filter(
      (t) => Number(t.assigneeId) === myId && t.status === "IN_PROGRESS"
    ).length;
    const resolved = tickets.filter(
      (t) => Number(t.assigneeId) === myId && t.status === "RESOLVED"
    ).length;
    const closed = tickets.filter(
      (t) => Number(t.assigneeId) === myId && t.status === "CLOSED"
    ).length;
    return { all: tickets.length, available, active, resolved, closed };
  }, [tickets, myId]);

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setResolveForm({
      explanation: "",
      internalNotes: "",
    });
    setDetailOpen(true);
  };

  const closeTicketDetails = () => {
    setDetailOpen(false);
    setSelectedTicket(null);
    setResolveForm({ explanation: "", internalNotes: "" });
  };

  const refreshSelectedFromList = async (id) => {
    await fetchTickets();
    const res = await ticketsApi.getById(id);
    setSelectedTicket(res?.data?.data || null);
  };

  const handleTake = async (id) => {
    if (!window.confirm("Take responsibility for this ticket?")) return;
    try {
      await ticketsApi.takeResponsibility(id);
      await refreshSelectedFromList(id);
      setActiveTab("MY_ACTIVE");
      alert("✅ Ticket assigned and moved to IN_PROGRESS.");
    } catch (err) {
      alert("❌ " + (err?.response?.data?.message || "Failed to take ticket"));
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const explanation = resolveForm.explanation.trim();
    if (!explanation) {
      alert("Resolution explanation is required.");
      return;
    }

    setSubmitting(true);
    try {
      await ticketsApi.resolve(
        selectedTicket.id,
        explanation,
        resolveForm.internalNotes?.trim() || null
      );

      await refreshSelectedFromList(selectedTicket.id);
      setActiveTab("RESOLVED");
      alert("✅ Ticket moved to RESOLVED.");
    } catch (err) {
      alert("❌ " + (err?.response?.data?.message || "Failed to resolve ticket"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm("Close this RESOLVED ticket now?")) return;
    try {
      await ticketsApi.updateStatus(id, "CLOSED");
      await refreshSelectedFromList(id);
      setActiveTab("CLOSED");
      alert("✅ Ticket moved to CLOSED.");
    } catch (err) {
      alert("❌ " + (err?.response?.data?.message || "Cannot close this ticket"));
    }
  };

  const getPriorityChip = (p) => {
    switch (p) {
      case "CRITICAL":
        return "bg-rose-600 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-violet-600 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getStatusChip = (s) => {
    switch (s) {
      case "OPEN":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "RESOLVED":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      case "CLOSED":
        return "bg-violet-50/80 text-violet-500 border-violet-100";
      case "REJECTED":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const normalizeImg = (img) => {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    if (img.startsWith("/uploads")) return img;
    if (img.startsWith("uploads")) return `/${img}`;
    return `/uploads/${img}`;
  };

  const canTake =
    selectedTicket &&
    !selectedTicket.assigneeId &&
    selectedTicket.status === "OPEN";

  const isMyActive =
    selectedTicket &&
    Number(selectedTicket.assigneeId) === myId &&
    selectedTicket.status === "IN_PROGRESS";

  const isMyResolved =
    selectedTicket &&
    Number(selectedTicket.assigneeId) === myId &&
    selectedTicket.status === "RESOLVED";

  return (
    <div className="max-w-7xl mx-auto pb-20 p-6 md:p-0">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[linear-gradient(135deg,#6D28D9_0%,#8B5CF6_100%)] rounded-2xl shadow-lg shadow-violet-200">
            <ClipboardList className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Technician Workbench</h1>
            <p className="text-slate-500 font-medium mt-0.5">
              View all tickets first, then jump into your working queues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto">
          <button
            onClick={fetchTickets}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>

          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full xl:w-auto flex-wrap">
            {[
              { id: "ALL", label: `All (${counts.all})`, icon: Eye },
              { id: "MY_ACTIVE", label: `My Active (${counts.active})`, icon: UserCheck },
              { id: "AVAILABLE", label: `Available (${counts.available})`, icon: ClipboardList },
              { id: "RESOLVED", label: `Resolved (${counts.resolved})`, icon: CheckCircle2 },
              { id: "CLOSED", label: `Closed (${counts.closed})`, icon: BadgeCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-violet-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Ticket list */}
        <section className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
              {activeTab.replace("_", " ")} Queue
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border px-2.5 py-1 rounded-lg">
              {filteredTickets.length} items
            </span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {fetching ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Loading tickets...
                </p>
              </div>
            ) : fetchError ? (
              <div className="py-16 px-6 text-center">
                <p className="text-sm font-bold text-rose-600">{fetchError}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Refresh after the backend data issue is fixed.
                </p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-semibold">
                No tickets found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTickets.map((t) => {
                  const selected = Number(selectedTicket?.id) === Number(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTicketDetails(t)}
                      className={`w-full text-left px-5 py-4 transition ${
                        selected ? "bg-violet-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 line-clamp-1">
                            {t.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {t.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${getPriorityChip(t.priority)}`}>
                          {t.priority}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusChip(t.status)}`}>
                          {String(t.status).replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right: Ticket details */}
        <section className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[420px]">
          {!selectedTicket ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <CircleDot className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Select a ticket</h3>
              <p className="text-sm text-slate-400 mt-1">
                Click a ticket from the left panel to view all details.
              </p>
            </div>
          ) : (
            <div className="p-6 md:p-7">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedTicket.title}</h2>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${getPriorityChip(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusChip(selectedTicket.status)}`}>
                      {String(selectedTicket.status).replace("_", " ")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeTicketDetails}
                  className="self-start p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter</p>
                  <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    {selectedTicket.reporterName || "Unknown"}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Technician</p>
                  <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    {selectedTicket.assigneeName || "Unassigned"}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{selectedTicket.category || "N/A"}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created At</p>
                  <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-slate-500" />
                    {selectedTicket.createdAt
                      ? new Date(selectedTicket.createdAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description || "No description"}
                </div>
              </div>

              {/* Resolution note if exists */}
              {selectedTicket.resolutionExplanation && (
                <div className="mt-6 p-4 bg-fuchsia-50 border border-fuchsia-100 rounded-xl">
                  <p className="text-[10px] font-black text-fuchsia-700 uppercase tracking-widest">
                    Resolution Note
                  </p>
                  <p className="text-sm text-fuchsia-800 mt-2 whitespace-pre-wrap">
                    {selectedTicket.resolutionExplanation}
                  </p>
                </div>
              )}

              {/* Images */}
              <div className="mt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Evidence Images
                </p>
                {selectedTicket.images?.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    {selectedTicket.images.map((img, idx) => (
                      <a key={idx} href={normalizeImg(img)} target="_blank" rel="noreferrer">
                        <img
                          src={normalizeImg(img)}
                          alt={`ticket-evidence-${idx}`}
                          className="w-full h-28 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">No images attached.</p>
                )}
              </div>

              {/* Reject reason if any */}
              {selectedTicket.status === "REJECTED" && selectedTicket.rejectionReason && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-orange-800 mt-2">{selectedTicket.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-7 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setCommentTicketId(selectedTicket.id);
                    setCommentOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open Comments
                </button>

                {canTake && (
                  <button
                    onClick={() => handleTake(selectedTicket.id)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[linear-gradient(135deg,#6D28D9_0%,#8B5CF6_100%)] text-white hover:opacity-95 text-sm font-black"
                  >
                    Take Ticket
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {isMyResolved && (
                  <button
                    onClick={() => handleClose(selectedTicket.id)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-700 text-white hover:bg-slate-800 text-sm font-black"
                  >
                    Close Ticket
                    <ArrowRightCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Resolve box INSIDE detail panel */}
              {isMyActive && (
                <div className="mt-6 p-5 rounded-2xl border border-violet-200 bg-violet-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-violet-700" />
                    <p className="text-sm font-black text-violet-800 uppercase tracking-wide">
                      Move to RESOLVED
                    </p>
                  </div>

                  <form onSubmit={handleResolve} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        Resolution Message (Required)
                      </label>
                      <textarea
                        required
                        rows={4}
                        className="mt-1.5 w-full px-4 py-3 bg-white border border-violet-200 rounded-xl text-sm"
                        placeholder="Describe exactly what you fixed..."
                        value={resolveForm.explanation}
                        onChange={(e) =>
                          setResolveForm((p) => ({ ...p, explanation: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        Internal Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        className="mt-1.5 w-full px-4 py-3 bg-white border border-violet-200 rounded-xl text-sm"
                        placeholder="Optional technical notes..."
                        value={resolveForm.internalNotes}
                        onChange={(e) =>
                          setResolveForm((p) => ({ ...p, internalNotes: e.target.value }))
                        }
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[linear-gradient(135deg,#6D28D9_0%,#8B5CF6_100%)] text-white hover:opacity-95 text-sm font-black disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Resolve Ticket
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Comments modal */}
      <TicketComments
        ticketId={commentTicketId}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        currentUserName={user?.name}
      />
    </div>
  );
}
