"use client"

export type AddressRecord = {
  id: string
  fullName: string
  phone: string
  address: string
  city: string
  province: string
  postalCode: string
  country: string
  isDefault: boolean
  updatedAt: string
}

function getStorageKey(userId: string) {
  return `candrashair-addresses-v1:${userId}`
}

export function readAddresses(userId: string): AddressRecord[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean) as AddressRecord[]
  } catch {
    return []
  }
}

export function writeAddresses(userId: string, addresses: AddressRecord[]) {
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(addresses))
}

export function upsertAddress(userId: string, next: AddressRecord) {
  const current = readAddresses(userId)
  const without = current.filter((item) => item.id !== next.id)
  const updated = next.isDefault ? [next, ...without.map((item) => ({ ...item, isDefault: false }))] : [next, ...without]
  writeAddresses(userId, updated)
}

export function deleteAddress(userId: string, id: string) {
  const current = readAddresses(userId)
  const updated = current.filter((item) => item.id !== id)
  writeAddresses(userId, updated)
}

export function setDefaultAddress(userId: string, id: string) {
  const current = readAddresses(userId)
  const updated = current.map((item) => ({ ...item, isDefault: item.id === id }))
  writeAddresses(userId, updated)
}

