/** Constantes de reglas de negocio compartidas. */
export const BUSINESS_RULES = {
  /** Días antes del vencimiento en que se avisa al alumno. */
  DUE_SOON_NOTICE_DAYS: 5,
  /** Cantidad de cuotas impagas a partir de la cual se avisa que adeuda. */
  DEBT_WARNING_INVOICES: 1,
  /** Cantidad de cuotas impagas a partir de la cual se niega el acceso. */
  ACCESS_DENIED_INVOICES: 2,
} as const;
