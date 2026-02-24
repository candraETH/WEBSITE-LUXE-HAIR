export const WHATSAPP_NUMBER = "6282234109177"

// Toggle this to true when you want to re-enable WhatsApp links and actions.
export const WHATSAPP_ENABLED = true

export function buildWhatsAppUrlForNumber(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
}

export function buildWhatsAppUrl(message: string): string {
  return buildWhatsAppUrlForNumber(WHATSAPP_NUMBER, message)
}

export function getWhatsAppHref(message: string): string {
  return WHATSAPP_ENABLED ? buildWhatsAppUrl(message) : "#"
}
