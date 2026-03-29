import "server-only"
import { randomUUID } from "crypto"
import { deleteSecurityStoreValue, getSecurityStoreValue, setSecurityStoreValue } from "@/lib/security-store"

export const ORDER_OTP_PURPOSES = ["track_order", "send_invoice"] as const
export type OrderOtpPurpose = (typeof ORDER_OTP_PURPOSES)[number]

export type OrderOtpChallengePayload = {
  orderId: string
  phoneNumber: string
  purpose: OrderOtpPurpose
  otpHash: string
  attemptsLeft: number
  expiresAt: number
}

export type OrderOtpSessionPayload = {
  orderId: string
  phoneNumber: string
  purpose: OrderOtpPurpose
  issuedAt: number
}

export const ORDER_OTP_TTL_SECONDS = 10 * 60
export const ORDER_OTP_SESSION_TTL_SECONDS = 15 * 60

export function isOrderOtpPurpose(value: unknown): value is OrderOtpPurpose {
  return value === "track_order" || value === "send_invoice"
}

export function getOrderOtpChallengeKey(challengeId: string) {
  return `order-otp:${challengeId}`
}

export function getOrderOtpSessionKey(sessionToken: string) {
  return `order-session:${sessionToken}`
}

export async function storeOrderOtpChallenge(challengeId: string, payload: OrderOtpChallengePayload) {
  await setSecurityStoreValue(getOrderOtpChallengeKey(challengeId), payload, ORDER_OTP_TTL_SECONDS)
}

export async function getOrderOtpChallenge(challengeId: string) {
  return getSecurityStoreValue<OrderOtpChallengePayload>(getOrderOtpChallengeKey(challengeId))
}

export async function deleteOrderOtpChallenge(challengeId: string) {
  await deleteSecurityStoreValue(getOrderOtpChallengeKey(challengeId))
}

export async function issueOrderOtpSession(payload: OrderOtpSessionPayload) {
  const sessionToken = `${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`
  await setSecurityStoreValue(getOrderOtpSessionKey(sessionToken), payload, ORDER_OTP_SESSION_TTL_SECONDS)
  return sessionToken
}

export async function getOrderOtpSession(sessionToken: string) {
  return getSecurityStoreValue<OrderOtpSessionPayload>(getOrderOtpSessionKey(sessionToken))
}

export async function deleteOrderOtpSession(sessionToken: string) {
  await deleteSecurityStoreValue(getOrderOtpSessionKey(sessionToken))
}
