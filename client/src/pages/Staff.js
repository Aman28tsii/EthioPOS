/**
 * Staff Management Component
 * Fully responsive with consistent design system
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

  // Check permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg 
                          flex items-center gap-2 animate-slideIn ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? 
              <CheckCircle size={18} /> : 
              <AlertCircle size={18} />
            }
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <div className="h-1 w-8 bg-blue-600 rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Human Capital
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Staff Directory
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              Manage team members and access permissions
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                      size={18} />
              <input 
                type="text" 
                placeholder="Search team..."
                value={searchTerm}
                className="w-full sm:w-64 pl-10 pr-10 py-2 bg-white border border-gray-300 
                           rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 
                           text-sm transition duration-200"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                             hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {isAdmin && (
              <button 
                onClick={openAddModal}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white 
                           px-4 py-2 rounded-xl font-semibold flex items-center 
                           justify-center gap-2 shadow-sm transition duration-200 
                           active:scale-95"
              >
                <UserPlus size={18} /> Add Member
              </button>
            )}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard 
            label="Total Staff" 
            value={totalStaff} 
            icon={<Users size={20}/>} 
            color="blue" 
          />
          <StatCard 
            label="Admins" 
            value={adminCount} 
            icon={<Shield size={20}/>} 
            color="yellow" 
          />
          <StatCard 
            label="Active" 
            value={activeCount} 
            icon={<Award size={20}/>} 
            color="green" 
          />
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div className="py-16 md:py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <span className="text-sm font-medium text-gray-500">Loading team data...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 md:py-20 flex flex-col items-center gap-3 text-gray-400">
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
              placeholder="Enter full name"
            />
            <FormInput 
              label="Email Address" 
              type="email"
              value={formData.email}
              onChange={(val) => setFormData({...formData, email: val})}
              required
              placeholder="email@example.com"
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
              placeholder="Enter full name"
            />
            <FormInput 
              label="Email Address" 
              type="email"
              value={formData.email}
              onChange={(val) => setFormData({...formData, email: val})}
              required
              placeholder="email@example.com"
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
    owner: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    staff: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const avatarColors = {
    owner: 'bg-yellow-500',
    admin: 'bg-blue-600',
    staff: 'bg-gray-500'
  };

  return (
    <div className={`bg-white rounded-2xl p-4 md:p-6 border shadow-sm 
                     hover:shadow-md transition-all duration-200 group ${
      person.status === 'inactive' 
        ? 'opacity-60 border-red-200' 
        : 'border-gray-100 hover:border-blue-200'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                         text-white font-bold text-lg shadow-sm ${
          avatarColors[person.role] || avatarColors.staff
        }`}>
          {person.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button 
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 
                           rounded-xl transition-all duration-200"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
            )}
            {canDelete && (
              <button 
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 
                           rounded-xl transition-all duration-200"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
            {person.name}
          </h3>
          {isCurrentUser && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full 
                             font-semibold">
              You
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase 
                            border ${roleColors[person.role] || roleColors.staff}`}>
            {person.role}
          </span>
          {person.status === 'inactive' && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase 
                             bg-red-100 text-red-600 border border-red-200">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-gray-600">
        <Mail size={14} className="flex-shrink-0" />
        <span className="text-xs md:text-sm font-medium truncate">{person.email}</span>
      </div>
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600"
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm 
                    flex items-center gap-3 md:gap-4">
      <div className={`p-2.5 md:p-3 rounded-xl ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

/**
 * Modal Component
 */
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center 
                  justify-center z-50 p-4">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-slideIn">
      <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
        <button 
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                     rounded-xl transition-all duration-200"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  </div>
);

/**
 * Form Input Component
 */
const FormInput = ({ label, type = 'text', value, onChange, placeholder, required, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input 
      type={type}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-transparent transition duration-200 
                 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

/**
 * Form Select Component
 */
const FormSelect = ({ label, value, onChange, options, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-transparent transition duration-200 
                 disabled:opacity-50 disabled:cursor-not-allowed"
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
  <div className="flex flex-col sm:flex-row gap-3 pt-4">
    <button 
      type="button" 
      onClick={onCancel}
      className="w-full sm:w-auto px-4 py-2 text-gray-700 font-medium 
                 bg-gray-200 hover:bg-gray-300 rounded-xl 
                 transition duration-200 active:scale-95"
    >
      Cancel
    </button>
    <button 
      type="submit" 
      disabled={saving}
      className="w-full sm:flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                 text-white rounded-xl font-semibold shadow-sm 
                 transition duration-200 flex items-center justify-center gap-2 
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