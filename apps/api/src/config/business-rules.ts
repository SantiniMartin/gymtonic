/** Reglas de negocio del gimnasio. Cambiarlas acá afecta a toda la API. */
export const BUSINESS_RULES = {
  /** Días antes del vencimiento en que se avisa al alumno. */
  DUE_SOON_NOTICE_DAYS: 5,
  /** Cuotas impagas a partir de las cuales se avisa que adeuda. */
  DEBT_WARNING_INVOICES: 1,
  /** Cuotas impagas a partir de las cuales se niega el acceso. */
  ACCESS_DENIED_INVOICES: 2,
};
