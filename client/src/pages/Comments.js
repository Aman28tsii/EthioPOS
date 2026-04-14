/**
 * Comments Page
 * Customer feedback and internal notes management
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Star,
  Search,
  Filter,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ChevronDown
} from 'lucide-react';
import API from '../api/axios';

// ═══════════════════════════════════════════════════════════════
// COMMENT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

const CommentCard = ({ comment, onDelete, onStatusChange, userRole }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    setDeleting(true);
    await onDelete(comment.id);
    setDeleting(false);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTypeStyle = (type) => {
    const styles = {
      feedback:   'bg-blue-100 text-blue-700',
      complaint:  'bg-red-100 text-red-700',
      suggestion: 'bg-purple-100 text-purple-700',
      praise:     'bg-green-100 text-green-700'
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending:  'bg-yellow-100 text-yellow-700',
      reviewed: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm 
                    hover:shadow-md hover:border-blue-100 transition-all duration-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 
                          text-white flex items-center justify-center text-sm font-bold 
                          shadow-sm flex-shrink-0">
            {comment.customer_name?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {comment.customer_name || 'Anonymous'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <Clock size={11} />
              <span>
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full 
                           ${getStatusStyle(comment.status)}`}>
            {comment.status}
          </span>

          {/* Delete Button (Admin/Owner only) */}
          {(userRole === 'admin' || userRole === 'owner') && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 
                         rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {deleting 
                ? <Loader2 size={14} className="animate-spin" /> 
                : <Trash2 size={14} />
              }
            </button>
          )}
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Type Badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize 
                         ${getTypeStyle(comment.type)}`}>
          {comment.type}
        </span>

        {/* Rating Stars */}
        {comment.rating && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={star <= comment.rating 
                  ? getRatingColor(comment.rating) 
                  : 'text-gray-200'
                }
                fill={star <= comment.rating ? 'currentColor' : 'none'}
              />
            ))}
            <span className={`text-xs font-bold ml-1 ${getRatingColor(comment.rating)}`}>
              {comment.rating}/5
            </span>
          </div>
        )}
      </div>

      {/* Comment Text */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4 bg-gray-50 
                    rounded-xl p-3 border border-gray-100">
        "{comment.message}"
      </p>

      {/* Status Change (Admin/Owner only) */}
      {(userRole === 'admin' || userRole === 'owner') && 
       comment.status !== 'resolved' && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {comment.status === 'pending' && (
            <button
              onClick={() => onStatusChange(comment.id, 'reviewed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                         bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg 
                         transition-all duration-200"
            >
              <CheckCircle size={12} />
              Mark Reviewed
            </button>
          )}
          {(comment.status === 'pending' || comment.status === 'reviewed') && (
            <button
              onClick={() => onStatusChange(comment.id, 'resolved')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                         bg-green-50 text-green-600 hover:bg-green-100 rounded-lg 
                         transition-all duration-200"
            >
              <CheckCircle size={12} />
              Mark Resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ADD COMMENT MODAL
// ═══════════════════════════════════════════════════════════════

const AddCommentModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    customer_name: '',
    message: '',
    type: 'feedback',
    rating: 5
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.message.trim()) {
      setError('Message is required');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit(form);
    setSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError('Failed to submit comment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md 
                      max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white 
                            flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Comment</h2>
              <p className="text-xs text-gray-500">Record customer feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                       rounded-xl transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 
                            rounded-xl text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Name
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                    size={16} />
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Enter customer name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comment Type
            </label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 
                                     text-gray-400 pointer-events-none" size={16} />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent text-sm appearance-none 
                           bg-white transition-all"
              >
                <option value="feedback">💬 General Feedback</option>
                <option value="complaint">⚠️ Complaint</option>
                <option value="suggestion">💡 Suggestion</option>
                <option value="praise">⭐ Praise</option>
              </select>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={28}
                    className={star <= form.rating 
                      ? 'text-yellow-400' 
                      : 'text-gray-200'
                    }
                    fill={star <= form.rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
              <span className="text-sm font-semibold text-gray-600 ml-2">
                {form.rating}/5
              </span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Enter customer feedback or comment..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent text-sm resize-none transition-all"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.message.length}/500 characters
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 
                         hover:bg-gray-50 rounded-xl font-medium text-sm 
                         transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.message.trim()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white 
                         rounded-xl font-semibold text-sm transition-all duration-200 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Comment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMMENTS PAGE
// ═══════════════════════════════════════════════════════════════

const Comments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState(null);

  // Get user info
  const getUserInfo = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  };
  const user = getUserInfo();

  // ─── Show Notification ───────────────────────────────────────
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── Fetch Comments ──────────────────────────────────────────
  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/comments');
      setComments(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Fetch comments error:', err);
      // Use local storage fallback
      try {
        const cached = JSON.parse(localStorage.getItem('comments_cache')) || [];
        setComments(cached);
      } catch {
        setComments([]);
      }
      showNotification('Using cached data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  // ─── Add Comment ─────────────────────────────────────────────
  const handleAddComment = async (formData) => {
    try {
      const res = await API.post('/comments', {
        customer_name: formData.customer_name || 'Anonymous',
        message: formData.message,
        type: formData.type,
        rating: formData.rating,
        status: 'pending'
      });

      const newComment = res.data?.comment || res.data;
      setComments(prev => [newComment, ...prev]);
      showNotification('Comment added successfully!');
      return true;
    } catch (err) {
      console.error('Add comment error:', err);
      showNotification('Failed to add comment', 'error');
      return false;
    }
  };

  // ─── Delete Comment ──────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await API.delete(`/comments/${id}`);
      setComments(prev => prev.filter(c => c.id !== id));
      showNotification('Comment deleted');
    } catch (err) {
      console.error('Delete comment error:', err);
      showNotification('Failed to delete comment', 'error');
    }
  };

  // ─── Update Status ────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/comments/${id}`, { status: newStatus });
      setComments(prev =>
        prev.map(c => c.id === id ? { ...c, status: newStatus } : c)
      );
      showNotification(`Marked as ${newStatus}`);
    } catch (err) {
      console.error('Status update error:', err);
      showNotification('Failed to update status', 'error');
    }
  };

  // ─── Filter Comments ─────────────────────────────────────────
  const filteredComments = comments.filter(comment => {
    const matchesSearch =
      comment.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      comment.message?.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'all' || comment.type === filterType;
    const matchesStatus = filterStatus === 'all' || comment.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // ─── Stats ────────────────────────────────────────────────────
  const stats = {
    total:    comments.length,
    pending:  comments.filter(c => c.status === 'pending').length,
    resolved: comments.filter(c => c.status === 'resolved').length,
    avgRating: comments.length > 0
      ? (comments.reduce((s, c) => s + (c.rating || 0), 0) / comments.length).toFixed(1)
      : '0.0'
  };

  return (
    <div className="min-h-full bg-gray-900 p-4 md:p-6">

      {/* ── Notification Toast ─────────────────────────────────── */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg 
                        flex items-center gap-2 text-white text-sm font-medium
                        transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />
          }
          {notification.message}
        </div>
      )}

      {/* ── Add Comment Modal ──────────────────────────────────── */}
      {showModal && (
        <AddCommentModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddComment}
        />
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center 
                      sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white 
                            flex items-center justify-center shadow-lg shadow-blue-500/20">
              <MessageSquare size={20} />
            </div>
            Comments & Feedback
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-13">
            Manage customer feedback and reviews
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-xl font-semibold text-sm shadow-lg 
                     shadow-blue-500/20 transition-all duration-200 active:scale-95 
                     self-start sm:self-auto"
        >
          <Plus size={18} />
          Add Comment
        </button>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Comments',
            value: stats.total,
            icon: MessageSquare,
            color: 'bg-blue-500/10 text-blue-400',
            iconBg: 'bg-blue-500/20'
          },
          {
            label: 'Pending Review',
            value: stats.pending,
            icon: Clock,
            color: 'bg-yellow-500/10 text-yellow-400',
            iconBg: 'bg-yellow-500/20'
          },
          {
            label: 'Resolved',
            value: stats.resolved,
            icon: CheckCircle,
            color: 'bg-green-500/10 text-green-400',
            iconBg: 'bg-green-500/20'
          },
          {
            label: 'Avg Rating',
            value: stats.avgRating,
            icon: Star,
            color: 'bg-purple-500/10 text-purple-400',
            iconBg: 'bg-purple-500/20'
          }
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-2xl p-4 border border-gray-700 
                       hover:border-gray-600 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-xs font-medium uppercase 
                            tracking-wide">
                {stat.label}
              </p>
              <div className={`w-8 h-8 rounded-lg flex items-center 
                              justify-center ${stat.iconBg}`}>
                <stat.icon size={16} className={stat.color.split(' ')[1]} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16} />
            <input
              type="text"
              placeholder="Search comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 
                         rounded-xl text-white text-sm placeholder-gray-400 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                           hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={14} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-gray-700 border border-gray-600 
                         rounded-xl text-white text-sm focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 appearance-none 
                         cursor-pointer transition-all min-w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="feedback">Feedback</option>
              <option value="complaint">Complaint</option>
              <option value="suggestion">Suggestion</option>
              <option value="praise">Praise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 
                                   text-gray-400" size={14} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-gray-700 border border-gray-600 
                         rounded-xl text-white text-sm focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 appearance-none 
                         cursor-pointer transition-all min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Comments List ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin mb-3" size={40} />
          <p className="font-medium text-sm">Loading comments...</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <MessageSquare size={48} strokeWidth={1.5} className="mb-3" />
          <p className="font-semibold text-base text-gray-400">
            {search || filterType !== 'all' || filterStatus !== 'all'
              ? 'No comments match your filters'
              : 'No comments yet'
            }
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {!search && filterType === 'all' && filterStatus === 'all'
              ? 'Click "Add Comment" to record customer feedback'
              : 'Try adjusting your filters'
            }
          </p>
          {!search && filterType === 'all' && filterStatus === 'all' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 
                         hover:bg-blue-700 text-white rounded-xl text-sm font-medium 
                         transition-all duration-200"
            >
              <Plus size={16} />
              Add First Comment
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results Count */}
          <p className="text-gray-500 text-xs font-medium mb-4">
            Showing {filteredComments.length} of {comments.length} comments
          </p>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                userRole={user.role}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Comments;