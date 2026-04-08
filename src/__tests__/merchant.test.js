import { describe, it, expect } from 'vitest';

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

const VALID_STATUSES = ['pending_receipt', 'accepted', 'making', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

function isValidTransition(currentStatus, newStatus) {
  const allowed = STATUS_FLOW[currentStatus] || [];
  return allowed.includes(newStatus);
}

function canSkipToStatus(currentStatus, targetStatus) {
  const flow = STATUS_FLOW[currentStatus] || [];
  if (flow.includes(targetStatus)) return true;

  const currentIndex = VALID_STATUSES.indexOf(currentStatus);
  const targetIndex = VALID_STATUSES.indexOf(targetStatus);

  if (currentIndex < 0 || targetIndex < 0) return false;

  if (targetStatus === 'cancelled') return true;

  return false;
}

describe('Order Status Flow', () => {
  describe('isValidTransition', () => {
    it('should allow transition from pending_receipt to accepted', () => {
      expect(isValidTransition('pending_receipt', 'accepted')).toBe(true);
    });

    it('should allow transition from pending_receipt to cancelled', () => {
      expect(isValidTransition('pending_receipt', 'cancelled')).toBe(true);
    });

    it('should not allow transition from pending_receipt to making', () => {
      expect(isValidTransition('pending_receipt', 'making')).toBe(false);
    });

    it('should not allow transition from pending_receipt to ready', () => {
      expect(isValidTransition('pending_receipt', 'ready')).toBe(false);
    });

    it('should allow transition from accepted to making', () => {
      expect(isValidTransition('accepted', 'making')).toBe(true);
    });

    it('should allow transition from accepted to cancelled', () => {
      expect(isValidTransition('accepted', 'cancelled')).toBe(true);
    });

    it('should not allow transition from accepted to out_for_delivery', () => {
      expect(isValidTransition('accepted', 'out_for_delivery')).toBe(false);
    });

    it('should allow transition from making to ready', () => {
      expect(isValidTransition('making', 'ready')).toBe(true);
    });

    it('should allow transition from making to cancelled', () => {
      expect(isValidTransition('making', 'cancelled')).toBe(true);
    });

    it('should not allow transition from making to delivered', () => {
      expect(isValidTransition('making', 'delivered')).toBe(false);
    });

    it('should allow transition from ready to out_for_delivery', () => {
      expect(isValidTransition('ready', 'out_for_delivery')).toBe(true);
    });

    it('should allow transition from ready to delivered', () => {
      expect(isValidTransition('ready', 'delivered')).toBe(true);
    });

    it('should allow transition from ready to cancelled', () => {
      expect(isValidTransition('ready', 'cancelled')).toBe(true);
    });

    it('should allow transition from out_for_delivery to delivered', () => {
      expect(isValidTransition('out_for_delivery', 'delivered')).toBe(true);
    });

    it('should allow transition from out_for_delivery to cancelled', () => {
      expect(isValidTransition('out_for_delivery', 'cancelled')).toBe(true);
    });

    it('should not allow transition from out_for_delivery to completed', () => {
      expect(isValidTransition('out_for_delivery', 'completed')).toBe(false);
    });

    it('should allow transition from delivered to completed', () => {
      expect(isValidTransition('delivered', 'completed')).toBe(true);
    });

    it('should allow transition from delivered to cancelled', () => {
      expect(isValidTransition('delivered', 'cancelled')).toBe(true);
    });

    it('should not allow any transitions from completed', () => {
      expect(isValidTransition('completed', 'accepted')).toBe(false);
      expect(isValidTransition('completed', 'making')).toBe(false);
      expect(isValidTransition('completed', 'ready')).toBe(false);
      expect(isValidTransition('completed', 'delivered')).toBe(false);
      expect(isValidTransition('completed', 'cancelled')).toBe(false);
    });

    it('should not allow any transitions from cancelled', () => {
      expect(isValidTransition('cancelled', 'pending_receipt')).toBe(false);
      expect(isValidTransition('cancelled', 'accepted')).toBe(false);
      expect(isValidTransition('cancelled', 'making')).toBe(false);
      expect(isValidTransition('cancelled', 'ready')).toBe(false);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidTransition('invalid_status', 'accepted')).toBe(false);
      expect(isValidTransition('pending_receipt', 'invalid_status')).toBe(false);
    });
  });

  describe('canSkipToStatus', () => {
    it('should return true for valid direct transitions', () => {
      expect(canSkipToStatus('pending_receipt', 'accepted')).toBe(true);
      expect(canSkipToStatus('accepted', 'making')).toBe(true);
    });

    it('should return true when target is cancelled from any active state', () => {
      expect(canSkipToStatus('pending_receipt', 'cancelled')).toBe(true);
      expect(canSkipToStatus('accepted', 'cancelled')).toBe(true);
      expect(canSkipToStatus('making', 'cancelled')).toBe(true);
      expect(canSkipToStatus('ready', 'cancelled')).toBe(true);
      expect(canSkipToStatus('out_for_delivery', 'cancelled')).toBe(true);
      expect(canSkipToStatus('delivered', 'cancelled')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(canSkipToStatus('invalid', 'accepted')).toBe(false);
      expect(canSkipToStatus('pending_receipt', 'invalid')).toBe(false);
    });
  });

  describe('STATUS_FLOW completeness', () => {
    it('should have all valid statuses defined', () => {
      for (const status of VALID_STATUSES) {
        expect(STATUS_FLOW).toHaveProperty(status);
      }
    });

    it('should have pending_receipt as the first status', () => {
      expect(VALID_STATUSES[0]).toBe('pending_receipt');
    });

    it('should have completed and cancelled as terminal states', () => {
      expect(STATUS_FLOW.completed).toEqual([]);
      expect(STATUS_FLOW.cancelled).toEqual([]);
    });

    it('should have cancellable transitions from all active states', () => {
      const activeStates = ['pending_receipt', 'accepted', 'making', 'ready', 'out_for_delivery', 'delivered'];
      for (const state of activeStates) {
        expect(STATUS_FLOW[state]).toContain('cancelled');
      }
    });
  });
});

describe('Order Data Normalization', () => {
  function normalizeOrders(rows) {
    return (rows || []).map((order) => ({
      ...order,
      items: (order.order_items || []).map((item) => ({
        ...item,
        customization: item.customization || {},
      })),
    }));
  }

  it('should normalize orders with order_items', () => {
    const orders = [
      {
        id: 'order-1',
        status: 'pending_receipt',
        order_items: [
          { id: 'item-1', title: 'Rice', customization: { size: 'large' } },
          { id: 'item-2', title: 'Noodles', customization: null },
        ],
      },
    ];

    const normalized = normalizeOrders(orders);

    expect(normalized[0].items[0].customization).toEqual({ size: 'large' });
    expect(normalized[0].items[1].customization).toEqual({});
  });

  it('should handle null or undefined order_items', () => {
    const orders = [
      { id: 'order-1', status: 'pending_receipt', order_items: null },
      { id: 'order-2', status: 'accepted', order_items: undefined },
    ];

    const normalized = normalizeOrders(orders);

    expect(normalized[0].items).toEqual([]);
    expect(normalized[1].items).toEqual([]);
  });

  it('should handle empty arrays', () => {
    const normalized = normalizeOrders([]);
    expect(normalized).toEqual([]);
  });

  it('should handle null input', () => {
    const normalized = normalizeOrders(null);
    expect(normalized).toEqual([]);
  });
});

describe('Batch Operations Validation', () => {
  const BATCH_MAX_SIZE = 50;

  function validateBatchSize(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return { valid: false, error: 'orderIds must be a non-empty array' };
    }
    if (orderIds.length > BATCH_MAX_SIZE) {
      return { valid: false, error: `Batch size exceeds maximum of ${BATCH_MAX_SIZE}` };
    }
    return { valid: true };
  }

  it('should reject empty arrays', () => {
    const result = validateBatchSize([]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('orderIds must be a non-empty array');
  });

  it('should reject non-arrays', () => {
    const result = validateBatchSize('order-1');
    expect(result.valid).toBe(false);
  });

  it('should reject arrays exceeding max size', () => {
    const orderIds = Array.from({ length: 51 }, (_, i) => `order-${i}`);
    const result = validateBatchSize(orderIds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Batch size exceeds maximum of 50');
  });

  it('should accept valid arrays within size limit', () => {
    const orderIds = Array.from({ length: 50 }, (_, i) => `order-${i}`);
    const result = validateBatchSize(orderIds);
    expect(result.valid).toBe(true);
  });
});

describe('Filter Validation', () => {
  function validateFilters(filters) {
    const errors = [];

    if (filters.status) {
      for (const status of filters.status) {
        if (!VALID_STATUSES.includes(status)) {
          errors.push(`Invalid status: ${status}`);
        }
      }
    }

    const validOrderTypes = ['pickup', 'dine_in', 'delivery'];
    if (filters.orderType) {
      for (const type of filters.orderType) {
        if (!validOrderTypes.includes(type)) {
          errors.push(`Invalid order type: ${type}`);
        }
      }
    }

    return errors;
  }

  it('should return no errors for valid filters', () => {
    const filters = {
      status: ['pending_receipt', 'accepted'],
      orderType: ['pickup', 'delivery'],
    };
    const errors = validateFilters(filters);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid status', () => {
    const filters = { status: ['invalid_status'] };
    const errors = validateFilters(filters);
    expect(errors).toContain('Invalid status: invalid_status');
  });

  it('should return errors for invalid order type', () => {
    const filters = { orderType: ['invalid_type'] };
    const errors = validateFilters(filters);
    expect(errors).toContain('Invalid order type: invalid_type');
  });

  it('should return multiple errors for multiple invalid values', () => {
    const filters = {
      status: ['invalid_status', 'also_invalid'],
      orderType: ['bad_type'],
    };
    const errors = validateFilters(filters);
    expect(errors).toHaveLength(3);
  });
});

describe('Pagination Calculation', () => {
  function calculatePagination(totalItems, page, pageSize) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  it('should calculate correct pagination for first page', () => {
    const result = calculatePagination(100, 1, 20);
    expect(result.totalPages).toBe(5);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it('should calculate correct pagination for middle page', () => {
    const result = calculatePagination(100, 3, 20);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(true);
  });

  it('should calculate correct pagination for last page', () => {
    const result = calculatePagination(100, 5, 20);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(true);
  });

  it('should handle single page', () => {
    const result = calculatePagination(5, 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(false);
  });

  it('should handle empty results', () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(false);
  });
});