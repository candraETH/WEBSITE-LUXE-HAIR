import { z } from "zod"

const DISALLOWED_ADDRESS_MARKERS = ["test", "asdf", "unknown", "lorem ipsum", "dummy"]

export function hasAddressLettersAndNumbers(value: string) {
  return /[a-z]/i.test(value) && /\d/.test(value)
}

export function containsDisallowedAddressMarker(value: string) {
  const normalized = value.trim().toLowerCase()
  return DISALLOWED_ADDRESS_MARKERS.some((marker) => normalized.includes(marker))
}

export const checkoutCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().regex(/^\+\d{8,15}$/),
  addressLine: z
    .string()
    .trim()
    .min(8)
    .max(300)
    .refine((value) => hasAddressLettersAndNumbers(value), "Address should contain letters and numbers.")
    .refine((value) => !containsDisallowedAddressMarker(value), "Address looks invalid."),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(3).max(32),
  country: z.string().trim().min(2).max(120),
})

export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>

export function normalizeCheckoutCustomer(input: CheckoutCustomerInput): CheckoutCustomerInput {
  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    whatsapp: input.whatsapp.trim(),
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    province: input.province.trim(),
    postalCode: input.postalCode.trim(),
    country: input.country.trim(),
  }
}
