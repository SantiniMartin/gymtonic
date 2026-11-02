/**
 * Enums de dominio compartidos entre API y Web.
 * Deben mantenerse sincronizados con los enums de `apps/api/prisma/schema.prisma`.
 */
export const Role = {
  MEMBER: 'MEMBER',
  TRAINER: 'TRAINER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  MERCADOPAGO: 'MERCADOPAGO',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const AccessResult = {
  ALLOWED: 'ALLOWED',
  WARNED: 'WARNED',
  DENIED: 'DENIED',
} as const;
export type AccessResult = (typeof AccessResult)[keyof typeof AccessResult];

export const PayrollStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type PayrollStatus = (typeof PayrollStatus)[keyof typeof PayrollStatus];

export const NotificationType = {
  DUE_SOON: 'DUE_SOON',
  DEBT_ONE: 'DEBT_ONE',
  ACCESS_BLOCKED: 'ACCESS_BLOCKED',
  ROUTINE_ASSIGNED: 'ROUTINE_ASSIGNED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYROLL_PAID: 'PAYROLL_PAID',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** 0 = domingo ... 6 = sábado (igual que Date#getDay) */
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
