/**
 * Staff Management Component
 * Restored full features + Pending Approval workflow
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import {
  Users, UserPlus, Shield, Mail, Trash2, Loader2,
  Award, Search, X, Edit2, CheckCircle, AlertCircle
} from 'lucide-react';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff',
    password: '',
    status: 'active'
  });

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const cached = localStorage.getItem('user');
      if (cached) setCurrentUser(JSON.parse(cached));
    } catch (e) {
      console.error('Failed to parse user data');
    }
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isOwner = currentUser?.role === 'owner';

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/staff');
      const staffData = Array.isArray(res.data) ? res.data : [];
      setStaff(staffData);
      localStorage.setItem('ultra_staff_directory', JSON.stringify(staffData));
    } catch (err) {
      console.error("Staff fetch error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('loginStateChange'));
        navigate('/login');
        return;
      }
      try {
        const cached = JSON.parse(localStorage.getItem('ultra_staff_directory'));
        if (cached) setStaff(cached);
      } catch (e) {
        console.error('Cache error:', e);
      }
      showNotification('Failed to load staff data', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const counts = useMemo(() => {
    const c = { all: staff.length, pending: 0, active: 0, inactive: 0, suspended: 0 };
    staff.forEach(s => {
      const st = s.status || 'active';
      if (c[st] !== undefined) c[st]++;
    });
    return c;
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return staff
      .filter(person => {
        const st = person.status || 'active';
        if (statusFilter === 'all') return true;
        return st === statusFilter;
      })
      .filter(person =>
        person.name?.toLowerCase().includes(q) ||
        person.email?.toLowerCase().includes(q) ||
        person.role?.toLowerCase().includes(q)
      );
  }, [staff, searchTerm, statusFilter]);

  const totalStaff = staff.length;
  const adminCount = staff.filter(s => s.role === 'admin' || s.role === 'owner').length;
  const activeCount = staff.filter(s => (s.status || 'active') === 'active').length;

  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'staff', password: '', status: 'active' });
    setSelectedStaff(null);
  };

  const openAddModal = () => { resetForm(); setShowAddModal(true); };

  const openEditModal = (person) => {
    setFormData({
      name: person.name || '',
      email: person.email || '',
      role: person.role || 'staff',
      status: person.status || 'active',
      password: ''
    });
    setSelectedStaff(person);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  const approveMember = async (person) => {
    if (!isOwner) {
      showNotification('Only owner can approve pending accounts', 'error');
      return;
    }
    try {
      setSaving(true);
      await API.put(`/staff/${person.id}`, { status: 'active' });
      setStaff(prev => prev.map(s => (s.id === person.id ? { ...s, status: 'active' } : s)));
      showNotification(`Approved ${person.name}`);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to approve member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      showNotification('All fields are required', 'error');
      return;
    }
    if (formData.password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      };
      const res = await API.post('/staff', payload);
      const created = res.data?.staff || res.data;
      if (created) setStaff(prev => [created, ...prev]);
      closeModals();
      showNotification('Staff member added successfully');
    } catch (err) {
      console.error("Add staff error:", err);
      showNotification(err.response?.data?.error || 'Failed to add staff member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!formData.name.trim() || !formData.email.trim()) {
      showNotification('Name and email are required', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status
      };
      if (formData.password && formData.password.length >= 6) {
        payload.password = formData.password;
      }
      await API.put(`/staff/${selectedStaff.id}`, payload);
      setStaff(prev => prev.map(s =>
        s.id === selectedStaff.id ? { ...s, ...payload } : s
      ));
      closeModals();
      showNotification('Staff member updated successfully');
    } catch (err) {
      console.error("Update staff error:", err);
      showNotification(err.response?.data?.error || 'Failed to update staff member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id, name) => {
    if (id === currentUser?.id) {
      showNotification('Cannot delete your own account', 'error');
      return;
    }
    if (!window.confirm(`Remove "${name}" from the team? This cannot be undone.`)) return;
    const previousState = [...staff];
    setStaff(staff.filter(s => s.id !== id));
    try {
      await API.delete(`/staff/${id}`);
      showNotification('Staff member removed');
    } catch (err) {
      console.error("Delete error:", err);
      setStaff(previousState);
      showNotification(err.response?.data?.error || 'Failed to remove staff member', 'error');
    }
  };

  if (!isAdmin) {
    return (
      // ✅ FIXED: bg-gray-50 → bg-gray-900
      <div className="min-h-full bg-gray-900 p-6">
        <div className="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <p className="text-white font-medium">Access denied.</p>
          <p className="text-gray-400 text-sm mt-1">
            Only Admin/Owner can access Staff Management.
          </p>
        </div>
      </div>
    );
  }

  return (
    // ✅ FIXED: bg-gray-50 → bg-gray-900
    <div className="min-h-full bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Notification Toast - unchanged */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg
                          flex items-center gap-2 animate-slideIn ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success'
              ? <CheckCircle size={18} />
              : <AlertCircle size={18} />
            }
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start 
                           md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <div className="h-1 w-8 bg-blue-500 rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Human Capital
              </span>
            </div>
            {/* ✅ FIXED: text-gray-900 → text-white */}
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Staff Directory
            </h1>
            {/* ✅ FIXED: text-gray-600 → text-gray-400 */}
            <p className="text-gray-400 text-sm md:text-base mt-1">
              Manage team members and access permissions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18} />
              {/* ✅ FIXED: bg-white → bg-gray-700, border-gray-300 → border-gray-600 */}
              <input
                type="text"
                placeholder="Search team..."
                value={searchTerm}
                className="w-full sm:w-64 pl-10 pr-10 py-2 bg-gray-700 border border-gray-600
                           rounded-xl text-white placeholder-gray-400 focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 text-sm transition duration-200"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={openAddModal}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white
                         px-4 py-2 rounded-xl font-semibold flex items-center
                         justify-center gap-2 shadow-sm transition duration-200
                         active:scale-95"
            >
              <UserPlus size={18} /> Add Member
            </button>
          </div>
        </header>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All ({counts.all})
          </TabBtn>
          <TabBtn active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
            Pending ({counts.pending})
          </TabBtn>
          <TabBtn active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
            Active ({counts.active})
          </TabBtn>
          <TabBtn active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>
            Inactive ({counts.inactive})
          </TabBtn>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Staff"  value={totalStaff}   icon={<Users  size={20} />} color="blue"   />
          <StatCard label="Admins"       value={adminCount}   icon={<Shield size={20} />} color="yellow" />
          <StatCard label="Active"       value={activeCount}  icon={<Award  size={20} />} color="green"  />
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div className="py-16 md:py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <span className="text-sm font-medium text-gray-400">Loading team data...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 md:py-20 flex flex-col items-center gap-3 text-gray-500">
            <Users size={48} strokeWidth={1.5} />
            <p className="font-medium text-sm">
              {searchTerm ? 'No staff members match your search' : 'No staff members found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredStaff.map((person) => (
              <StaffCard
                key={person.id}
                person={person}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isOwner={isOwner}
                saving={saving}
                onApprove={() => approveMember(person)}
                onEdit={() => openEditModal(person)}
                onDelete={() => deleteMember(person.id, person.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal title="Add Staff Member" onClose={closeModals}>
          <form onSubmit={handleAddMember} className="space-y-4">
            <FormInput label="Full Name" value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })} required />
            <FormInput label="Email Address" type="email" value={formData.email}
              onChange={(val) => setFormData({ ...formData, email: val })} required />
            <FormInput label="Password" type="password" value={formData.password}
              onChange={(val) => setFormData({ ...formData, password: val })} required />
            <FormSelect
              label="Role"
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
                ...(isOwner ? [{ value: 'owner', label: 'Owner' }] : [])
              ]}
            />
            <ModalActions onCancel={closeModals} saving={saving} submitLabel="Add Member" />
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStaff && (
        <Modal title="Edit Staff Member" onClose={closeModals}>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <FormInput label="Full Name" value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })} required />
            <FormInput label="Email Address" type="email" value={formData.email}
              onChange={(val) => setFormData({ ...formData, email: val })} required />
            <FormInput label="New Password (optional)" type="password" value={formData.password}
              onChange={(val) => setFormData({ ...formData, password: val })} />
            <FormSelect
              label="Role"
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
                ...(isOwner ? [{ value: 'owner', label: 'Owner' }] : [])
              ]}
              disabled={selectedStaff.id === currentUser?.id}
            />
            <FormSelect
              label="Status"
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'pending',   label: 'Pending'   },
                { value: 'active',    label: 'Active'    },
                { value: 'inactive',  label: 'Inactive'  },
                { value: 'suspended', label: 'Suspended' }
              ]}
              disabled={selectedStaff.id === currentUser?.id}
            />
            <ModalActions onCancel={closeModals} saving={saving} submitLabel="Update Member" />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ─── Tab Button ───────────────────────────────────────────────
// ✅ FIXED: dark theme tab buttons
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition duration-200 ${
      active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {children}
  </button>
);

// ─── Staff Card ───────────────────────────────────────────────
// ✅ FIXED: bg-white → bg-gray-800, all light colors → dark equivalents
const StaffCard = ({ person, currentUser, isAdmin, isOwner, onApprove, onEdit, onDelete, saving }) => {
  const isCurrentUser = currentUser?.id === person.id;
  const canEdit    = isAdmin && (isOwner || person.role !== 'owner');
  const canDelete  = isOwner && !isCurrentUser && person.role !== 'owner';
  const canApprove = isOwner && person.status === 'pending';

  const roleColors = {
    owner: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    staff: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const statusColors = {
    active:    'bg-green-500/20 text-green-400 border-green-500/30',
    pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    inactive:  'bg-red-500/20 text-red-400 border-red-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const avatarColors = {
    owner: 'bg-yellow-500',
    admin: 'bg-blue-600',
    staff: 'bg-gray-600'
  };

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 md:p-6 border shadow-sm 
                     hover:shadow-lg hover:shadow-black/20 transition-all duration-200 
                     group ${
      (person.status === 'inactive' || person.status === 'suspended')
        ? 'opacity-70 border-red-500/30'
        : 'border-gray-700 hover:border-blue-500/50'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                         text-white font-bold text-lg shadow-sm ${
          avatarColors[person.role] || avatarColors.staff
        }`}>
          {(person.name || 'U').charAt(0).toUpperCase()}
        </div>

        {(canEdit || canDelete) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 
                           rounded-xl transition-all duration-200"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 
                           rounded-xl transition-all duration-200"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {/* ✅ FIXED: text-gray-900 → text-white */}
          <h3 className="text-base md:text-lg font-semibold text-white truncate">
            {person.name}
          </h3>
          {isCurrentUser && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 
                             rounded-full font-semibold border border-blue-500/30">
              You
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border 
                           ${roleColors[person.role] || roleColors.staff}`}>
            {person.role}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border ${
            statusColors[person.status || 'active'] || statusColors.active
          }`}>
            {(person.status || 'active')}
          </span>
        </div>
      </div>

      {/* ✅ FIXED: border-gray-100 → border-gray-700, text-gray-600 → text-gray-400 */}
      <div className="pt-4 border-t border-gray-700 flex items-center gap-2 text-gray-400">
        <Mail size={14} className="flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium truncate">{person.email}</span>
      </div>

      {canApprove && (
        <button
          onClick={onApprove}
          disabled={saving}
          className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 
                     rounded-xl font-semibold transition duration-200 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve
        </button>
      )}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────
// ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700
const StatCard = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue:   'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    green:  'bg-green-500/20 text-green-400'
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 
                    shadow-sm flex items-center gap-3 md:gap-4 
                    hover:border-gray-600 transition-all duration-200">
      <div className={`p-2.5 md:p-3 rounded-xl ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        {/* ✅ FIXED: text-gray-500 → text-gray-400 */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        {/* ✅ FIXED: text-gray-900 → text-white */}
        <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────
// ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center 
                  justify-center z-50 p-4">
    <div className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-2xl 
                    shadow-2xl shadow-black/50 animate-slideIn">
      <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-700">
        {/* ✅ FIXED: text-gray-900 → text-white */}
        <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 
                     rounded-xl transition-all duration-200"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  </div>
);

// ─── Form Input ───────────────────────────────────────────────
// ✅ FIXED: bg-white → bg-gray-700, border-gray-300 → border-gray-600
const FormInput = ({ label, type = 'text', value, onChange, required, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <input
      type={type}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl
                 text-white placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-transparent transition duration-200 
                 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

// ─── Form Select ──────────────────────────────────────────────
// ✅ FIXED: bg-white → bg-gray-700, border-gray-300 → border-gray-600
const FormSelect = ({ label, value, onChange, options, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl
                 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-transparent transition duration-200 
                 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}
                className="bg-gray-700 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ─── Modal Actions ────────────────────────────────────────────
// ✅ FIXED: bg-gray-200 → bg-gray-700
const ModalActions = ({ onCancel, saving, submitLabel }) => (
  <div className="flex flex-col sm:flex-row gap-3 pt-4">
    <button
      type="button"
      onClick={onCancel}
      className="w-full sm:w-auto px-4 py-2 text-gray-300 font-medium
                 bg-gray-700 hover:bg-gray-600 border border-gray-600
                 rounded-xl transition duration-200 active:scale-95"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={saving}
      className="w-full sm:flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                 text-white rounded-xl font-semibold shadow-sm transition 
                 duration-200 flex items-center justify-center gap-2
                 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
    >
      {saving ? (
        <>
          <Loader2 className="animate-spin" size={18} />
          Saving...
        </>
      ) : (
        submitLabel
      )}
    </button>
  </div>
);

export default Staff;