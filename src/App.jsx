import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import CustomizationModal from './components/CustomizationModal.jsx';
import CartPanel from './components/CartPanel.jsx';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { apiRequest } from './lib/api.js';
import { useAuth } from './context/AuthContext.jsx';
import { estimateLinePrice } from './lib/pricing.js';

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryFlags, setInventoryFlags] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dishy-web-cart') || '[]');
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState('');

  const inventoryMap = useMemo(
    () => Object.fromEntries((inventoryFlags || []).map((flag) => [flag.ingredient_code, flag.is_available])),
    [inventoryFlags]
  );

  useEffect(() => {
    localStorage.setItem('dishy-web-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
    else setOrders([]);
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  async function fetchMenu() {
    try {
      const data = await apiRequest('/api/menu');
      setMenuItems(data.menuItems || []);
      setInventoryFlags(data.inventoryFlags || []);
    } catch (error) {
      setToast(error.message);
    }
  }

  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const data = await apiRequest('/api/orders');
      setOrders(data.orders || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setLoadingOrders(false);
    }
  }

  function addToCart(customization, quantity) {
    if (!activeItem) return;
    const unitPrice = estimateLinePrice(activeItem, customization);
    const lineTotal = unitPrice * quantity;
    const cartId = crypto.randomUUID();
    setCartItems((current) => [
      ...current,
      {
        cartId,
        menuItemId: activeItem.id || activeItem.slug,
        name: activeItem.name,
        customization,
        quantity,
        unitPrice,
        lineTotal,
      },
    ]);
    setActiveItem(null);
    setCartOpen(true);
    setToast('Added to cart');
  }

  function updateQty(cartId, quantity) {
    setCartItems((current) =>
      current.map((item) =>
        item.cartId === cartId
          ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
          : item
      )
    );
  }

  async function handleCheckout(payload) {
    try {
      const data = await apiRequest('/api/orders', {
        method: 'POST',
        body: { ...payload, cartItems },
      });
      setCartItems([]);
      await refreshProfile();
      await fetchOrders();
      setCartOpen(false);
      setToast(`Order placed: ${data.order.id.slice(0, 8)}`);
      navigate('/orders');
    } catch (error) {
      setToast(error.message);
    }
  }

  async function handleToggleInventory(ingredientCode, isAvailable) {
    try {
      await apiRequest('/api/admin-inventory', {
        method: 'POST',
        body: { ingredientCode, isAvailable },
      });
      await fetchMenu();
      setToast('Inventory updated');
    } catch (error) {
      setToast(error.message);
    }
  }

  async function handleUpdateStatus(orderId, status) {
    try {
      await apiRequest('/api/admin-order-status', {
        method: 'POST',
        body: { orderId, status },
      });
      await fetchOrders();
      const adminOrders = await apiRequest('/api/admin-orders');
      setOrders(adminOrders.orders || []);
      setToast('Order status updated');
    } catch (error) {
      setToast(error.message);
    }
  }

  async function fetchAdminOrders() {
    try {
      const data = await apiRequest('/api/admin-orders');
      setOrders(data.orders || []);
    } catch (error) {
      setToast(error.message);
    }
  }

  async function handleBootstrapAdmin(secret) {
    try {
      await apiRequest('/api/admin-bootstrap', { method: 'POST', body: { secret } });
      await refreshProfile();
      await fetchAdminOrders();
      setToast('This account is now admin');
      return 'This account is now admin. Refresh complete.';
    } catch (error) {
      setToast(error.message);
      return error.message;
    }
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminOrders();
    }
  }, [user?.role]);

  return (
    <>
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />
      {authLoading && <div className="shell"><div className="card empty-box">Loading session...</div></div>}
      {!authLoading && (
        <Routes>
          <Route path="/" element={<HomePage menuItems={menuItems} inventoryFlags={inventoryFlags} onCustomize={setActiveItem} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/orders" element={<OrdersPage orders={orders} loading={loadingOrders} onRefresh={fetchOrders} />} />
          <Route path="/profile" element={<ProfilePage orders={orders} />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                orders={orders}
                inventoryFlags={inventoryFlags}
                onRefresh={async () => {
                  await fetchMenu();
                  await fetchAdminOrders();
                }}
                onToggleInventory={handleToggleInventory}
                onUpdateStatus={handleUpdateStatus}
                onBootstrapAdmin={handleBootstrapAdmin}
              />
            }
          />
        </Routes>
      )}

      <CustomizationModal item={activeItem} inventoryMap={inventoryMap} onClose={() => setActiveItem(null)} onAdd={addToCart} />
      <CartPanel
        open={cartOpen}
        cartItems={cartItems}
        user={user}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        onRemove={(cartId) => setCartItems((current) => current.filter((item) => item.cartId !== cartId))}
        onCheckout={handleCheckout}
      />

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
