import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';
import { formatCurrency } from '../lib/pricing.js';
import { formatCustomization, shortOrderId } from '../lib/orderFormatting.js';
import StatusBadge from '../components/StatusBadge.jsx';

const VALID_STATUSES = ['pending_receipt', 'accepted', 'making', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const STATUS_FLOW = {
  pending_receipt: ['accepted', 'cancelled'],
  accepted: ['making', 'cancelled'],
  making: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function MerchantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [statusCounts, setStatusCounts] = useState({});
  const [filters, setFilters] = useState({
    status: [],
    orderType: [],
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (page = 1, currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page });
      currentFilters.status.forEach(s => params.append('status', s));
      currentFilters.orderType.forEach(t => params.append('orderType', t));
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);

      const data = await apiRequest(`/api/merchant-orders?${params}`);
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, totalItems: 0 });
      setStatusCounts(data.statusCounts || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (user?.role === 'merchant' || user?.role === 'admin') {
      fetchOrders();
    }
  }, [user?.role]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(pagination.page, filters);
    setRefreshing(false);
    setToast('Orders refreshed');
  }, [fetchOrders, pagination.page, filters]);

  const handleStatusUpdate = useCallback(async (orderId, newStatus, reason = '') => {
    try {
      await apiRequest('/api/merchant-order-status', {
        method: 'POST',
        body: { orderId, status: newStatus, reason },
      });
      await fetchOrders(pagination.page, filters);
      setToast(`Order ${shortOrderId(orderId)} updated to ${newStatus}`);
    } catch (err) {
      setToast(err.message);
    }
  }, [fetchOrders, pagination.page, filters]);

  const handleBatchUpdate = useCallback(async (newStatus) => {
    try {
      const result = await apiRequest('/api/merchant-batch', {
        method: 'POST',
        body: {
          action: 'batch_update',
          orderIds: Array.from(selectedOrders),
          status: newStatus,
        },
      });
      setShowBatchModal(false);
      setSelectedOrders(new Set());
      await fetchOrders(pagination.page, filters);
      setToast(`Updated ${result.updatedCount} orders`);
    } catch (err) {
      setToast(err.message);
    }
  }, [selectedOrders, fetchOrders, pagination.page, filters]);

  const handleBatchCancel = useCallback(async (reason = '') => {
    try {
      const result = await apiRequest('/api/merchant-batch', {
        method: 'POST',
        body: {
          action: 'batch_cancel',
          orderIds: Array.from(selectedOrders),
          reason,
        },
      });
      setShowBatchModal(false);
      setSelectedOrders(new Set());
      await fetchOrders(pagination.page, filters);
      setToast(`Cancelled ${result.cancelledCount} orders`);
    } catch (err) {
      setToast(err.message);
    }
  }, [selectedOrders, fetchOrders, pagination.page, filters]);

  const handleViewHistory = useCallback(async (orderId) => {
    try {
      const data = await apiRequest(`/api/merchant-order-history?orderId=${orderId}`);
      setHistoryData(data.history || []);
      setShowHistoryModal(orderId);
    } catch (err) {
      setToast(err.message);
    }
  }, []);

  const toggleOrderSelection = useCallback((orderId) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const toggleAllSelection = useCallback(() => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  }, [orders, selectedOrders]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    fetchOrders(1, filters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters, fetchOrders]);

  const clearFilters = useCallback(() => {
    const emptyFilters = { status: [], orderType: [], search: '', dateFrom: '', dateTo: '' };
    setFilters(emptyFilters);
    fetchOrders(1, emptyFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [fetchOrders]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status.length) count++;
    if (filters.orderType.length) count++;
    if (filters.search) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  if (!user) {
    return <Navigate to="/merchant-login" replace />;
  }

  if (user.role !== 'merchant' && user.role !== 'admin') {
    return (
      <div className="page-shell shell narrow-shell">
        <div className="card gated-card">
          <h1>Merchant Access Required</h1>
          <p className="muted">You need a merchant account to access this page.</p>
          <div className="gated-actions">
            <button className="primary-btn" onClick={() => navigate('/merchant-login')}>
              Go to Merchant Login
            </button>
            <button className="ghost-btn" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell shell merchant-dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Merchant Dashboard</p>
          <h1>Order Management</h1>
        </div>
        <div className="merchant-dashboard__actions">
          <button className="ghost-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {selectedOrders.size > 0 && (
            <button className="primary-btn" onClick={() => setShowBatchModal(true)}>
              Batch Actions ({selectedOrders.size})
            </button>
          )}
        </div>
      </div>

      <div className="merchant-dashboard__stats">
        {VALID_STATUSES.map(status => (
          <div
            key={status}
            className={`merchant-stat-tile ${filters.status.includes(status) ? 'merchant-stat-tile--active' : ''}`}
            onClick={() => {
              const newStatuses = filters.status.includes(status)
                ? filters.status.filter(s => s !== status)
                : [...filters.status, status];
              handleFilterChange('status', newStatuses);
            }}
          >
            <span className="merchant-stat-tile__label">{formatStatusLabel(status)}</span>
            <strong className="merchant-stat-tile__count">{statusCounts[status] || 0}</strong>
          </div>
        ))}
      </div>

      <div className="merchant-dashboard__filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search by customer name, email or order ID..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />
          <select
            value={filters.orderType[0] || ''}
            onChange={(e) => handleFilterChange('orderType', e.target.value ? [e.target.value] : [])}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="pickup">Pickup</option>
            <option value="dine_in">Dine In</option>
            <option value="delivery">Delivery</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="filter-date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="filter-date"
          />
          <button className="primary-btn" onClick={applyFilters}>Apply</button>
          {activeFiltersCount > 0 && (
            <button className="ghost-btn" onClick={clearFilters}>Clear ({activeFiltersCount})</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <div className="card empty-box">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="card empty-box">No orders found matching your criteria.</div>
      ) : (
        <>
          <div className="merchant-orders-list">
            <div className="merchant-orders-header">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onChange={toggleAllSelection}
                />
                <span>Select All</span>
              </label>
              <span className="muted">Showing {orders.length} of {pagination.totalItems} orders</span>
            </div>

            {orders.map((order) => (
              <MerchantOrderCard
                key={order.id}
                order={order}
                selected={selectedOrders.has(order.id)}
                onSelect={() => toggleOrderSelection(order.id)}
                onUpdateStatus={handleStatusUpdate}
                onViewHistory={() => handleViewHistory(order.id)}
              />
            ))}
          </div>

          <div className="merchant-pagination">
            <button
              className="ghost-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchOrders(pagination.page - 1, filters)}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              className="ghost-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchOrders(pagination.page + 1, filters)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {showBatchModal && (
        <BatchActionModal
          selectedCount={selectedOrders.size}
          onUpdate={handleBatchUpdate}
          onCancel={handleBatchCancel}
          onClose={() => setShowBatchModal(false)}
        />
      )}

      {showHistoryModal && (
        <HistoryModal
          orderId={showHistoryModal}
          history={historyData}
          onClose={() => setShowHistoryModal(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MerchantOrderCard({ order, selected, onSelect, onUpdateStatus, onViewHistory }) {
  const availableTransitions = STATUS_FLOW[order.status] || [];
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <article className={`merchant-order-card ${selected ? 'merchant-order-card--selected' : ''}`}>
      <div className="merchant-order-card__header">
        <label className="checkbox-row">
          <input type="checkbox" checked={selected} onChange={onSelect} />
          <div>
            <h3>Order #{shortOrderId(order.id)}</h3>
            <p className="muted small-text">{new Date(order.created_at).toLocaleString('en-HK')}</p>
          </div>
        </label>
        <div className="merchant-order-card__header-right">
          <StatusBadge status={order.status} />
          <strong>{formatCurrency(order.total)}</strong>
          <button className="ghost-btn small-btn" onClick={onViewHistory}>History</button>
        </div>
      </div>

      <div className="merchant-order-card__customer">
        <div>
          <strong>{order.customer_name}</strong>
          <span className="muted">{order.customer_email}</span>
        </div>
        <div className="merchant-order-card__meta">
          <span className="merchant-order-type">{beautifyType(order.order_type)}</span>
          {order.scheduled_slot && (
            <span className="merchant-order-slot">{order.scheduled_slot}</span>
          )}
          {order.priority_delivery && (
            <span className="merchant-priority-badge">Priority</span>
          )}
        </div>
      </div>

      {order.delivery_address && (
        <div className="merchant-order-card__address">
          <span className="muted small-text">Delivery: </span>
          <span className="small-text">{order.delivery_address}</span>
        </div>
      )}

      <div className="merchant-order-card__items">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="merchant-order-item">
            <div>
              <strong>{item.quantity}x {item.title}</strong>
              {formatCustomization(item.customization || {}).map((line, i) => (
                <div key={i} className="muted small-text">{line}</div>
              ))}
            </div>
            <strong>{formatCurrency(item.line_total)}</strong>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="merchant-order-card__notes">
          <strong>Note: </strong>
          <span className="muted">{order.notes}</span>
        </div>
      )}

      <div className="status-actions merchant-status-actions">
        {availableTransitions.map((status) => (
          <button
            key={status}
            className={`ghost-btn ${status === 'cancelled' ? 'cancel-btn' : ''}`}
            onClick={() => onUpdateStatus(order.id, status)}
          >
            {formatStatusLabel(status)}
          </button>
        ))}
      </div>
    </article>
  );
}

function BatchActionModal({ selectedCount, onUpdate, onCancel, onClose }) {
  const [batchAction, setBatchAction] = useState('update');
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (batchAction === 'update' && newStatus) {
      onUpdate(newStatus);
    } else if (batchAction === 'cancel') {
      onCancel(reason);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Batch Actions ({selectedCount} orders)</h2>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
        <div className="modal__content">
          <div className="batch-action-tabs">
            <button
              className={`tab-btn ${batchAction === 'update' ? 'tab-btn--active' : ''}`}
              onClick={() => setBatchAction('update')}
            >
              Update Status
            </button>
            <button
              className={`tab-btn ${batchAction === 'cancel' ? 'tab-btn--active' : ''}`}
              onClick={() => setBatchAction('cancel')}
            >
              Cancel Orders
            </button>
          </div>

          {batchAction === 'update' && (
            <div className="batch-action-form">
              <label>
                New Status
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="">Select status...</option>
                  {VALID_STATUSES.filter(s => s !== 'cancelled').map(status => (
                    <option key={status} value={status}>{formatStatusLabel(status)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {batchAction === 'cancel' && (
            <div className="batch-action-form">
              <label>
                Cancellation Reason (optional)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </label>
            </div>
          )}

          <div className="modal__footer">
            <button className="ghost-btn" onClick={onClose}>Cancel</button>
            <button
              className="primary-btn"
              onClick={handleSubmit}
              disabled={batchAction === 'update' && !newStatus}
            >
              Apply to {selectedCount} Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ orderId, history, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Order History #{shortOrderId(orderId)}</h2>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
        <div className="modal__content">
          {history.length === 0 ? (
            <div className="empty-box">No history records found.</div>
          ) : (
            <div className="history-timeline">
              {history.map((entry, idx) => (
                <div key={entry.id || idx} className="history-entry">
                  <div className="history-entry__dot" />
                  <div className="history-entry__content">
                    <div className="history-entry__header">
                      <StatusBadge status={entry.new_status} />
                      <span className="muted small-text">
                        {new Date(entry.created_at).toLocaleString('en-HK')}
                      </span>
                    </div>
                    {entry.previous_status && (
                      <div className="history-entry__transition small-text muted">
                        {formatStatusLabel(entry.previous_status)} → {formatStatusLabel(entry.new_status)}
                      </div>
                    )}
                    {entry.reason && (
                      <div className="history-entry__reason small-text">
                        Reason: {entry.reason}
                      </div>
                    )}
                    <div className="history-entry__meta small-text muted">
                      By: {entry.changed_by_role || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatStatusLabel(status) {
  const labels = {
    pending_receipt: 'Pending Receipt',
    accepted: 'Accepted',
    making: 'Making',
    ready: 'Ready',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function beautifyType(type) {
  const map = { pickup: 'Pickup', dine_in: 'Dine In', delivery: 'Delivery' };
  return map[type] || type;
}