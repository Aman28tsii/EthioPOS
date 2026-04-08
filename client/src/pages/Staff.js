/**
 * Staff Management Component
 * Manage team members and permissions
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { 
  Users, UserPlus, Shield, Mail, Trash2, Loader2, 
  Award, Search, XCircle, ChevronRight, X, Edit2, CheckCircle
} from 'lucide-react';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: 'staff', 
    password: '',
    status: 'active'
  });
  
  const navigate = useNavigate();

  // Get current user
  useEffect(() => {
    try {
      const cached = localStorage.getItem('user');
      if (cached) setCurrentUser(JSON.parse(cached));
    } catch (e) {
      console.error('Failed to parse user data');
    }
  }, []);

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch team data
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
      // Try cached data
      try {
        const cached = JSON.parse(localStorage.getItem('ultra_staff_directory'));
        if (cached) setStaff(cached);
      } catch (e) {
        console.error('Cache error:', e);
      }
    } finally { 
      setLoading(false); 
    }
  }, [navigate]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staff.filter(person => 
      person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, searchTerm]);

  // Stats
  const totalStaff = staff.length;
  const adminCount = staff.filter(s => s.role === 'admin' || s.role === 'owner').length;
  const activeCount = staff.filter(s => s.status === 'active').length;

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'staff', password: '', status: 'active' });
    setSelectedStaff(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (person) => {
    setFormData({
      name: person.name,
      email: person.email,
      role: person.role || 'staff',
      status: person.status || 'active',
      password: ''
    });
    setSelectedStaff(person);
    setShowEditModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  // Add member
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
      setStaff(prev => [...prev, res.data]);
      closeModals();
      showNotification('Staff member added successfully');
    } catch (err) {
      console.error("Add staff error:", err);
      showNotification(err.response?.data?.error || 'Failed to add staff member', 'error');
    } finally { 
      setSaving(false); 
    }
  };

  // Update member
  const handleUpdateMember = async (e) => {
    e.preventDefault();

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

      // Include password only if changed
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

  // Delete member
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

  // Check if current user is admin/owner
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="min-h-full bg-[#FDFDFE] p-6 md:p-10 lg:p-16 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-6 right-6 z-[70] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${
            notification.type === 'success' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-12 bg-indigo-600 rounded-full" />
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-indigo-600/80">Human Capital</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              Staff <span className="font-light text-slate-400">Directory</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Manage team members and access permissions</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search team..."
                value={searchTerm}
                className="w-full sm:w-64 pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm font-medium transition-colors"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button 
                onClick={openAddModal}
                className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <UserPlus size={18} /> Add Member
              </button>
            )}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Staff" value={totalStaff} icon={<Users size={20}/>} color="indigo" />
          <StatCard label="Admins" value={adminCount} icon={<Shield size={20}/>} color="amber" />
          <StatCard label="Active" value={activeCount} icon={<Award size={20}/>} color="emerald" />
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <span className="text-sm font-medium text-slate-400">Loading team data...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
            <Users size={64} strokeWidth={1} />
            <p className="font-medium">
              {searchTerm ? 'No staff members match your search' : 'No staff members found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((person) => (
              <StaffCard 
                key={person.id} 
                person={person} 
                currentUser={currentUser}
                isAdmin={isAdmin}
                isOwner={isOwner}
                onEdit={() => openEditModal(person)}
                onDelete={() => deleteMember(person.id, person.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <Modal title="Add Staff Member" onClose={closeModals}>
          <form onSubmit={handleAddMember} className="space-y-4">
            <FormInput 
              label="Full Name" 
              value={formData.name}
              onChange={(val) => setFormData({...formData, name: val})}
              required
            />
            <FormInput 
              label="Email Address" 
              type="email"
              value={formData.email}
              onChange={(val) => setFormData({...formData, email: val})}
              required
            />
            <FormInput 
              label="Password" 
              type="password"
              value={formData.password}
              onChange={(val) => setFormData({...formData, password: val})}
              placeholder="Min. 6 characters"
              required
            />
            <FormSelect 
              label="Role"
              value={formData.role}
              onChange={(val) => setFormData({...formData, role: val})}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
                ...(isOwner ? [{ value: 'owner', label: 'Owner' }] : [])
              ]}
            />
            <ModalActions 
              onCancel={closeModals} 
              saving={saving} 
              submitLabel="Add Member"
            />
          </form>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedStaff && (
        <Modal title="Edit Staff Member" onClose={closeModals}>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <FormInput 
              label="Full Name" 
              value={formData.name}
              onChange={(val) => setFormData({...formData, name: val})}
              required
            />
            <FormInput 
              label="Email Address" 
              type="email"
              value={formData.email}
              onChange={(val) => setFormData({...formData, email: val})}
              required
            />
            <FormInput 
              label="New Password (optional)" 
              type="password"
              value={formData.password}
              onChange={(val) => setFormData({...formData, password: val})}
              placeholder="Leave blank to keep current"
            />
            <FormSelect 
              label="Role"
              value={formData.role}
              onChange={(val) => setFormData({...formData, role: val})}
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
              onChange={(val) => setFormData({...formData, status: val})}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              disabled={selectedStaff.id === currentUser?.id}
            />
            <ModalActions 
              onCancel={closeModals} 
              saving={saving} 
              submitLabel="Update Member"
            />
          </form>
        </Modal>
      )}
    </div>
  );
};

/**
 * Staff Card Component
 */
const StaffCard = ({ person, currentUser, isAdmin, isOwner, onEdit, onDelete }) => {
  const isCurrentUser = currentUser?.id === person.id;
  const canEdit = isAdmin && (isOwner || person.role !== 'owner');
  const canDelete = isOwner && !isCurrentUser && person.role !== 'owner';

  const roleColors = {
    owner: 'bg-amber-50 text-amber-600 border-amber-100',
    admin: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    staff: 'bg-slate-50 text-slate-500 border-slate-100'
  };

  const avatarColors = {
    owner: 'bg-amber-500',
    admin: 'bg-indigo-600',
    staff: 'bg-slate-400'
  };

  return (
    <div className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all group ${
      person.status === 'inactive' ? 'opacity-60 border-red-200' : 'border-slate-100'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${avatarColors[person.role] || avatarColors.staff}`}>
          {person.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button 
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
          )}
          {canDelete && (
            <button 
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">{person.name}</h3>
          {isCurrentUser && (
            <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">You</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roleColors[person.role] || roleColors.staff}`}>
            {person.role}
          </span>
          {person.status === 'inactive' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-500 border border-red-100">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-500">
        <Mail size={14} />
        <span className="text-xs font-medium truncate">{person.email}</span>
      </div>
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({ label, value, icon, color }) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600"
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

/**
 * Modal Component
 */
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slideIn">
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

/**
 * Form Input Component
 */
const FormInput = ({ label, type = 'text', value, onChange, placeholder, required, disabled }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</label>
    <input 
      type={type}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium disabled:opacity-50"
    />
  </div>
);

/**
 * Form Select Component
 */
const FormSelect = ({ label, value, onChange, options, disabled }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium disabled:opacity-50"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

/**
 * Modal Actions Component
 */
const ModalActions = ({ onCancel, saving, submitLabel }) => (
  <div className="flex gap-4 pt-4">
    <button 
      type="button" 
      onClick={onCancel}
      className="flex-1 py-3 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
    >
      Cancel
    </button>
    <button 
      type="submit" 
      disabled={saving}
      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {saving ? <Loader2 className="animate-spin" size={18} /> : submitLabel}
    </button>
  </div>
);

export default Staff;