import { allowCors, readJsonBody, sendJson } from '../lib/server/http.js';
import { requireUser } from '../lib/server/auth.js';
import { getServiceClient } from '../lib/server/supabase.js';
import { calculateLine, computeCoins } from '../lib/server/pricing.js';

function normalizeOrders(rows) {
  return (rows || []).map((order) => ({
    ...order,
    items: (order.order_items || []).map((item) => ({
      ...item,
      customization: item.customization || {},
    })),
  }));
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  try {
    const auth = await requireUser(req);
    const supabase = getServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return sendJson(res, 200, { orders: normalizeOrders(data) });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const cartItems = Array.isArray(body.cartItems) ? body.cartItems : [];
      if (!cartItems.length) return sendJson(res, 400, { error: 'Cart is empty' });

      const { data: menuItems, error: menuError } = await supabase.from('menu_items').select('*').eq('active', true);
      if (menuError) throw menuError;
      const menuMap = new Map(menuItems.map((item) => [item.id, item]));

      const { data: inventoryRows, error: inventoryError } = await supabase.from('inventory_flags').select('*');
      if (inventoryError) throw inventoryError;
      const inventoryMap = Object.fromEntries((inventoryRows || []).map((row) => [row.ingredient_code, row.is_available]));

      const pricedItems = cartItems.map((item) => {
        const menuItem = menuMap.get(item.menuItemId);
        if (!menuItem) throw new Error('One menu item no longer exists. Refresh the page and try again.');
        const calculated = calculateLine(menuItem, item.customization, item.quantity, inventoryMap);
        return {
          menuItem,
          ...calculated,
          title: menuItem.name,
        };
      });

      const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const coinsRedeemed = computeCoins(subtotal, body.coinsRedeemed, auth.profile?.loyalty_coins || 0);
      const deliveryFee = body.orderType === 'delivery' ? (body.priorityDelivery ? 12 : 6) : 0;
      const redeemValue = coinsRedeemed / 100;
      const total = Math.max(0, subtotal + deliveryFee - redeemValue);
      const earnedCoins = Math.floor(total);

      const orderPayload = {
        user_id: auth.user.id,
        order_type: body.orderType || 'pickup',
        scheduled_slot: body.scheduledSlot || null,
        priority_delivery: Boolean(body.priorityDelivery),
        customer_name: body.customerName || auth.profile?.full_name || auth.user.email,
        customer_email: body.customerEmail || auth.user.email,
        delivery_address: body.deliveryAddress || null,
        notes: body.notes || null,
        subtotal,
        coins_redeemed: coinsRedeemed,
        earned_coins: earnedCoins,
        total,
      };

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('*')
        .single();
      if (orderError) throw orderError;

      const orderItemsPayload = pricedItems.map((item) => ({
        order_id: insertedOrder.id,
        menu_item_id: item.menuItem.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        customization: item.customization,
      }));

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsPayload);
      if (orderItemsError) throw orderItemsError;

      const updatedCoins = Math.max(0, (auth.profile?.loyalty_coins || 0) - coinsRedeemed + earnedCoins);
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ loyalty_coins: updatedCoins })
        .eq('user_id', auth.user.id);
      if (profileUpdateError) throw profileUpdateError;

      const { data: orderWithItems, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', insertedOrder.id)
        .single();
      if (fetchError) throw fetchError;

      return sendJson(res, 201, { order: normalizeOrders([orderWithItems])[0], loyaltyCoins: updatedCoins });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Order request failed' });
  }
}
