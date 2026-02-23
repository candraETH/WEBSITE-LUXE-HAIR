import "server-only"

type OrderStatus =
  | "CREATED"
  | "CAPTURE_REQUESTED"
  | "CAPTURED_PENDING_WEBHOOK"
  | "PAID"
  | "FAILED"

export type StoredPayPalOrder = {
  paypalOrderId: string
  internalOrderId: string
  status: OrderStatus
  subtotalCents: number
  taxCents: number
  shippingCents: number
  totalCents: number
  currencyCode: "USD"
  updatedAt: number
  createdAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __CANDRAS_PAYPAL_ORDER_STORE__: Map<string, StoredPayPalOrder> | undefined
}

function getStore() {
  if (!global.__CANDRAS_PAYPAL_ORDER_STORE__) {
    global.__CANDRAS_PAYPAL_ORDER_STORE__ = new Map<string, StoredPayPalOrder>()
  }

  return global.__CANDRAS_PAYPAL_ORDER_STORE__
}

export function savePayPalOrder(order: Omit<StoredPayPalOrder, "createdAt" | "updatedAt">) {
  const now = Date.now()
  const payload: StoredPayPalOrder = {
    ...order,
    createdAt: now,
    updatedAt: now,
  }
  getStore().set(order.paypalOrderId, payload)
  return payload
}

export function getPayPalOrder(paypalOrderId: string) {
  return getStore().get(paypalOrderId)
}

export function updatePayPalOrderStatus(
  paypalOrderId: string,
  status: OrderStatus,
  overrides: Partial<Omit<StoredPayPalOrder, "paypalOrderId" | "internalOrderId" | "createdAt">> = {}
) {
  const existing = getStore().get(paypalOrderId)
  if (!existing) {
    return undefined
  }

  const updated: StoredPayPalOrder = {
    ...existing,
    ...overrides,
    status,
    updatedAt: Date.now(),
  }

  getStore().set(paypalOrderId, updated)
  return updated
}

