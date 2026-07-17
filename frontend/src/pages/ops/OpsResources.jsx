import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  Users,
  Layers,
  Box,
  Search,
  ImageIcon,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8083";

const EMPTY_FORM = {
  id: null,
  name: "",
  type: "",
  capacity: "",
  status: "AVAILABLE",
  description: "",
  location: "",
  imageUrl: "",
};

const TYPE_LABELS = {
  LECTURE_HALL: "Lecture Hall",
  LAB: "Lab",
  SPORTS_FACILITY: "Sports Facility",
  MEETING_ROOM: "Meeting Room",
  AUDITORIUM: "Auditorium",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

const STATUS_STYLES = {
  AVAILABLE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  UNAVAILABLE: "bg-rose-100 text-rose-700 border-rose-200",
  MAINTENANCE: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function OpsResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false); // Renamed for clarity
  const [preview, setPreview] = useState({ open: false, src: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fullImg = (path) =>
    !path ? null : path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.get("/resources");
      setResources(res.data);
    } catch {
      setError("Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      id: r.id,
      name: r.name || "",
      type: r.type || "",
      capacity: r.capacity ?? "",
      status: r.status || "AVAILABLE",
      description: r.description || "",
      location: r.location || "",
      imageUrl: r.imageUrl || "",
    });
    setFile(null);
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError("");
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const uploadImage = async () => {
    if (!file) return form.imageUrl || "";
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/resources/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const imageUrl = await uploadImage();
      const isEquip = form.type === "EQUIPMENT";
      const payload = {
        name: form.name.trim(),
        type: form.type,
        capacity: Number(form.capacity) || 0,
        status: form.status,
        description: form.description?.trim() || null,
        imageUrl: imageUrl || null,
        location: isEquip ? null : form.location?.trim() || null,
      };

      if (form.id) {
        await api.put(`/resources/${form.id}`, payload);
      } else {
        await api.post("/resources", payload);
      }
      closeModal();
      fetchResources();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (typeof err.response?.data === "string" ? err.response.data : null) ||
          "Failed to save resource.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this resource? This cannot be undone.")) return;
    try {
      await api.delete(`/resources/${id}`);
      fetchResources();
    } catch {
      setError("Failed to delete resource.");
    }
  };

  const filtered = resources.filter((r) => {
    const matchSearch =
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.location?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || r.type === filterType;
    return matchSearch && matchType;
  });

  const isEquip = form.type === "EQUIPMENT";

  return (
    <div className="space-y-6 pb-20 relative px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Box className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Resource Hub</h1>
            <p className="text-slate-500">Manage campus assets and facilities</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" /> Add New Resource
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-300 appearance-none"
        >
          <option value="ALL">All Categories</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-bold animate-shake">
          {error}
        </div>
      )}

      {/* GRID VIEW */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="h-48 bg-slate-50 relative overflow-hidden">
                {r.imageUrl ? (
                  <img src={fullImg(r.imageUrl)} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border backdrop-blur-md ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-800 mb-1">{r.name}</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-4">{TYPE_LABELS[r.type]}</p>
                <div className="flex gap-4 mb-4 text-slate-500">
                    <div className="flex items-center gap-1.5 text-xs font-medium"><MapPin size={14}/> {r.location || "N/A"}</div>
                    <div className="flex items-center gap-1.5 text-xs font-medium"><Users size={14}/> {r.capacity}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                    <Pencil size={14}/> Edit
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CENTERED SQUARE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal} />
          
          {/* Square Modal Container */}
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{form.id ? "Update Resource" : "Create New"}</h2>
                <p className="text-sm text-slate-500 font-medium">Enter resource details below</p>
              </div>
              <button onClick={closeModal} className="p-2 bg-slate-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Name</label>
                  <input required name="name" value={form.name} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Resource Title" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Category</label>
                  <select required name="type" value={form.type} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                    <option value="">Select...</option>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{isEquip ? "Qty" : "Seats"}</label>
                  <input required type="number" name="capacity" value={form.capacity} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                {!isEquip && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Location</label>
                    <input name="location" value={form.location} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Block A, Floor 2" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
                <div className="flex gap-2 mt-1">
                    {['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE'].map(s => (
                        <button 
                            key={s}
                            type="button"
                            onClick={() => setForm(f => ({...f, status: s}))}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${form.status === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Media</label>
                <div className="mt-1 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors relative">
                    <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="p-2 bg-white rounded-lg shadow-sm"><ImageIcon className="text-indigo-500" size={20}/></div>
                    <span className="text-xs font-bold text-slate-500 truncate">{file ? file.name : "Click to upload image"}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? "Processing..." : form.id ? "Update Changes" : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {preview.open && (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-8" onClick={() => setPreview({ open: false, src: "" })}>
          <img src={preview.src} alt="full preview" className="max-h-full max-w-full rounded-3xl shadow-2xl animate-in zoom-in-110 duration-300" />
        </div>
      )}
    </div>
  );
}
