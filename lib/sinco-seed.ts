// GENERADO desde 'MESSINA - IMPLEMENTACIÓN SINCO ERP.xlsx' (hoja '20260827 Preliminar').
// No editar a mano: se importa una sola vez y a partir de ahi se gestiona desde /cronogramas.
// Ver HANDOFF.md §5.12 para como se colapso la jerarquia de 6 niveles del Excel.

export type SincoTarea = { t: string; ini: string | null; fin: string | null; resp: string; ctx: string };
export type SincoFase = { titulo: string; contexto: string; inicio: string | null; fin: string | null; tareas: SincoTarea[] };
export type SincoCronograma = { titulo: string; etapa: string; inicio: string | null; fin: string | null; fases: SincoFase[] };

export const SINCO_CRONOGRAMAS: SincoCronograma[] = [
  {
    titulo: "SINCO 1 · Preparar", etapa: "PREPARAR", inicio: "2026-05-26", fin: "2026-09-04",
    fases: [
      {
        titulo: "Preliminares", contexto: "",
        inicio: "2026-05-26", fin: "2026-06-11",
        tareas: [
          { t: "Contratos Firmados", ini: "2026-05-26", fin: "2026-05-26", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Elaboración Inicial del Project Chárter", ini: "2026-06-10", fin: "2026-06-10", resp: "SINCOSOFT", ctx: "" },
          { t: "Elaboración de Cronograma preliminar", ini: "2026-06-11", fin: "2026-06-11", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Reunión Inicio del Proyecto", contexto: "",
        inicio: "2026-06-16", fin: "2026-06-19",
        tareas: [
          { t: "Revisión alcance del proyecto", ini: "2026-06-16", fin: "2026-06-16", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Revisión metodología de implementación", ini: "2026-06-16", fin: "2026-06-16", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Definición logística del proyecto", ini: "2026-06-16", fin: "2026-06-16", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acta Reunión Inicial", ini: "2026-06-19", fin: "2026-06-19", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-06-19", fin: "2026-06-19",
        tareas: [
          { t: "Ajustes y Aprobación del Project Chárter", ini: "2026-06-19", fin: "2026-06-19", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Project Chárter Firmado", ini: "2026-06-19", fin: "2026-06-19", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Sesión de Diagnóstico y Configuración", contexto: "",
        inicio: "2026-06-22", fin: "2026-06-25",
        tareas: [
          { t: "Sesión de Diagnóstico y configuración", ini: "2026-06-22", fin: "2026-06-22", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Lista de Chequeo de Diagnóstico Técnico", ini: "2026-06-25", fin: "2026-06-25", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Reuniones Iniciales por Módulo - SINCO ERP", contexto: "",
        inicio: "2026-06-25", fin: "2026-08-10",
        tareas: [
          { t: "Presentación inicial estructuración del sistema", ini: "2026-08-03", fin: "2026-08-04", resp: "SINCOSOFT - MESSINA", ctx: "Reunion Inicial Módulo Administración de Proyectos de Obra - ADPRO" },
          { t: "Entregar Presentación Inicial", ini: "2026-08-03", fin: "2026-08-03", resp: "SINCOSOFT", ctx: "Reunion Inicial Módulo Administración de Proyectos de Obra - ADPRO" },
          { t: "Acta Reunión Inicial Firmada", ini: "2026-08-10", fin: "2026-08-10", resp: "SINCOSOFT - MESSINA", ctx: "Reunion Inicial Módulo Administración de Proyectos de Obra - ADPRO" },
          { t: "Presentación inicial estructuración del módulo", ini: "2026-06-25", fin: "2026-06-25", resp: "SINCOSOFT - MESSINA", ctx: "Reunión Inicial Módulo Administrativo y Financiero - A&F" },
          { t: "Entregar Presentación Inicial", ini: "2026-06-25", fin: "2026-06-25", resp: "SINCOSOFT", ctx: "Reunión Inicial Módulo Administrativo y Financiero - A&F" },
          { t: "Acta Reunión Inicial Firmada", ini: "2026-07-01", fin: "2026-07-01", resp: "SINCOSOFT - MESSINA", ctx: "Reunión Inicial Módulo Administrativo y Financiero - A&F" },
          { t: "Presentación inicial estructuración del módulo", ini: "2026-07-10", fin: "2026-07-10", resp: "SINCOSOFT - MESSINA", ctx: "Reunión Inicial Módulo Facturación Electrónica - DS - FE - RE" },
          { t: "Entregar Presentación Inicial", ini: "2026-07-10", fin: "2026-07-10", resp: "SINCOSOFT", ctx: "Reunión Inicial Módulo Facturación Electrónica - DS - FE - RE" },
          { t: "Acta Reunión Inicial Firmada", ini: "2026-07-15", fin: "2026-07-15", resp: "SINCOSOFT - MESSINA", ctx: "Reunión Inicial Módulo Facturación Electrónica - DS - FE - RE" },
          { t: "Estructuración Integración ADPRO - A&F (Centros de Costos)", ini: "2026-08-06", fin: "2026-08-06", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Cronograma Línea Base", contexto: "",
        inicio: "2026-09-01", fin: "2026-09-04",
        tareas: [
          { t: "Reunión validación final cronograma línea base", ini: "2026-09-01", fin: "2026-09-01", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Cronograma Línea Base Aprobado", ini: "2026-09-04", fin: "2026-09-04", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 2 · Capacitaciones de gestión", etapa: "HABILITAR", inicio: "2026-09-02", fin: "2026-12-14",
    fases: [
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-09-02", fin: "2026-12-14",
        tareas: [
          { t: "Capacitación Creación de perfiles y usuarios", ini: "2026-09-02", fin: "2026-09-02", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Help Desk y CAPTA", ini: "2026-10-01", fin: "2026-10-01", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación WorkFlow", ini: "2026-12-09", fin: "2026-12-09", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Asistencia a Capacitaciones de Gestión", ini: "2026-12-14", fin: "2026-12-14", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 3 · A&F — BD Principal", etapa: "HABILITAR", inicio: "2026-08-20", fin: "2026-12-24",
    fases: [
      {
        titulo: "Migración Maestros en Pruebas", contexto: "",
        inicio: "2026-08-20", fin: "2026-09-03",
        tareas: [
          { t: "PRB_Entrega definitiva plantillas de migracion PUC, PUC 2, Terceros y CC diligenciadas", ini: "2026-08-20", fin: "2026-08-20", resp: "MESSINA", ctx: "" },
          { t: "PRB_Revisión y retroalimentación de plantillas de migración PUC, PUC 2, Terceros y CC", ini: "2026-08-21", fin: "2026-08-21", resp: "SINCOSOFT", ctx: "" },
          { t: "PRB_Ajuste y envío de plantillas de migración PUC, PUC 2, Terceros y CC", ini: "2026-08-28", fin: "2026-08-28", resp: "MESSINA", ctx: "" },
          { t: "PRB_Migración de plantillas PUC, PUC 2, Terceros y CC", ini: "2026-09-03", fin: "2026-09-03", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-09-04", fin: "2026-11-03",
        tareas: [
          { t: "Preparación de entorno para capacitaciones operativas", ini: "2026-09-04", fin: "2026-09-04", resp: "SINCOSOFT", ctx: "" },
          { t: "Entrada en Operación Help Desk", ini: "2026-10-13", fin: "2026-10-13", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento después de salida a producción", ini: "2026-10-28", fin: "2026-10-28", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Activos fijos Sesión I", ini: "2026-11-03", fin: "2026-11-03", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Sesión de Configuración contable de activos fijos", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Actas Sesiones de Consultoría Firmadas", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Envío de temarios y programación de capacitaciones", ini: "2026-08-31", fin: "2026-08-31", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Capacitaciones Operativas", contexto: "",
        inicio: "2026-09-07", fin: "2026-10-09",
        tareas: [
          { t: "Capacitación Configuraciones iniciales", ini: "2026-09-07", fin: "2026-09-07", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Creación de documentos contables y cuentas por pagar", ini: "2026-09-09", fin: "2026-09-09", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Administración, auditoria y control de contabilidad", ini: "2026-09-14", fin: "2026-09-14", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Gestión de cuentas por pagar y tesoreria Sesión I", ini: "2026-09-16", fin: "2026-09-16", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Gestión de cuentas por pagar y tesoreria Sesión II", ini: "2026-09-18", fin: "2026-09-18", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Facturación y cartera Sesión I", ini: "2026-09-21", fin: "2026-09-21", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Facturación y cartera Sesión II", ini: "2026-09-23", fin: "2026-09-23", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Multimonedas y diferencia en cambio", ini: "2026-10-06", fin: "2026-10-06", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Asistencia a Capacitaciones Operativas", ini: "2026-10-09", fin: "2026-10-09", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Parametrización Ambiente de Producción", contexto: "",
        inicio: "2026-09-18", fin: "2026-10-09",
        tareas: [
          { t: "PRD_Entrega de plantillas de migracion PUC, PUC 2, Terceros y CC diligenciadas", ini: "2026-09-18", fin: "2026-09-18", resp: "MESSINA", ctx: "Migración/Actualización Maestros a Producción" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración PUC, PUC 2, Terceros y CC", ini: "2026-09-21", fin: "2026-09-21", resp: "SINCOSOFT", ctx: "Migración/Actualización Maestros a Producción" },
          { t: "PRD_Ajuste y envío de plantillas de migración PUC, PUC 2, Terceros y CC", ini: "2026-09-23", fin: "2026-09-23", resp: "MESSINA", ctx: "Migración/Actualización Maestros a Producción" },
          { t: "PRD_Migración de plantillas PUC, PUC 2, Terceros y CC", ini: "2026-09-25", fin: "2026-09-25", resp: "SINCOSOFT", ctx: "Migración/Actualización Maestros a Producción" },
          { t: "Estructuración por el cliente Usuarios y perfiles creados en producción", ini: "2026-10-09", fin: "2026-10-09", resp: "MESSINA", ctx: "" },
          { t: "Entrega información cuenta de correo de notificación de pagos", ini: "2026-10-02", fin: "2026-10-02", resp: "MESSINA", ctx: "Parametrizaciones Generales" },
          { t: "Acompañamiento Configuraciones iniciales (Causación, Pagos, Facturación)", ini: "2026-10-07", fin: "2026-10-07", resp: "SINCOSOFT - MESSINA", ctx: "Parametrizaciones Generales" },
          { t: "PRD_Entrega de plantillas de migración Saldos CXP y CXC diligenciadas", ini: "2026-10-05", fin: "2026-10-05", resp: "MESSINA", ctx: "Migración Saldos CXP y CXC a Producción" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos CXC y CXP", ini: "2026-10-06", fin: "2026-10-06", resp: "SINCOSOFT", ctx: "Migración Saldos CXP y CXC a Producción" },
          { t: "PRD_Ajuste y envío de plantillas de migración saldos CXC y CXP", ini: "2026-10-07", fin: "2026-10-07", resp: "MESSINA", ctx: "Migración Saldos CXP y CXC a Producción" },
          { t: "PRD_Migración de plantillas saldos CXC y CXP", ini: "2026-10-08", fin: "2026-10-08", resp: "SINCOSOFT", ctx: "Migración Saldos CXP y CXC a Producción" },
        ],
      },
      {
        titulo: "Salida a Producción", contexto: "",
        inicio: "2026-10-13", fin: "2026-10-21",
        tareas: [
          { t: "Acompañamiento de Causación de contabilidad", ini: "2026-10-13", fin: "2026-10-13", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento de Pagos de tesorería", ini: "2026-10-14", fin: "2026-10-15", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento de Facturación", ini: "2026-10-16", fin: "2026-10-16", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Acompañamientos Salida a Producción", ini: "2026-10-21", fin: "2026-10-21", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Migración Históricos en Producción", contexto: "",
        inicio: "2026-11-12", fin: "2026-12-10",
        tareas: [
          { t: "PRD_ Acompañamiento avance diligenciamiento de plantillas Saldos Iniciales", ini: "2026-11-12", fin: "2026-11-12", resp: "SINCOSOFT - MESSINA", ctx: "Saldos Iniciales Principal y NIIF 31/12" },
          { t: "PRD_Entrega final plantillas de migración Saldos Iniciales", ini: "2026-11-25", fin: "2026-11-25", resp: "MESSINA", ctx: "Saldos Iniciales Principal y NIIF 31/12" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos Iniciales", ini: "2026-11-26", fin: "2026-12-01", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y NIIF 31/12" },
          { t: "PRD_Ajuste y envío de plantillas de migración Saldos Iniciales", ini: "2026-12-02", fin: "2026-12-09", resp: "MESSINA", ctx: "Saldos Iniciales Principal y NIIF 31/12" },
          { t: "PRD_Migración plantillas Saldos Iniciales", ini: "2026-12-10", fin: "2026-12-10", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y NIIF 31/12" },
          { t: "PRD_ Acompañamiento avance diligenciamiento de plantillas Movimientos Mes a Mes", ini: "2026-11-12", fin: "2026-11-12", resp: "SINCOSOFT - MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Entrega final plantillas de migración Movimientos Mes a Mes", ini: "2026-11-25", fin: "2026-11-25", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Movimientos Mes a Mes", ini: "2026-11-26", fin: "2026-12-01", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Ajuste y envío de plantillas de migración Movimientos Mes a Mes", ini: "2026-12-02", fin: "2026-12-09", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Migración plantillas Movimientos Mes a Mes", ini: "2026-12-10", fin: "2026-12-10", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
        ],
      },
      {
        titulo: "Migración de Activos Fijos en Pruebas", contexto: "",
        inicio: "2026-12-04", fin: "2026-12-24",
        tareas: [
          { t: "PRB_Acompañamiento avance diligenciamiento de plantilla Activos Fijos", ini: "2026-12-04", fin: "2026-12-04", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "PRB_Entrega del cliente plantilla de migración Activos Fijos diligenciada", ini: "2026-12-17", fin: "2026-12-17", resp: "MESSINA", ctx: "" },
          { t: "PRB_Revisión y retroalimentación de plantilla de migración Activos Fijos", ini: "2026-12-18", fin: "2026-12-21", resp: "SINCOSOFT", ctx: "" },
          { t: "PRB_Ajuste y envío de plantilla de migración Activos Fijos", ini: "2026-12-22", fin: "2026-12-23", resp: "MESSINA", ctx: "" },
          { t: "PRB_Migracion de plantilla Activos Fijos", ini: "2026-12-24", fin: "2026-12-24", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Capacitaciones Segundo Nivel", contexto: "",
        inicio: null, fin: null,
        tareas: [
          { t: "Capacitación Conciliación bancaria", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Traslados contables", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Reportes equivalentes e Informes personalizados", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Estados financieros personalizados", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Revelaciones", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Sesión Configuración Revelaciones", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Sesión Configuración Estados Financieros", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Cierre anual y de terceros", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Activos fijos Sesión II", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Asistencia a Capacitaciones Segundo Nivel", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Migración de Activos Fijos a Producción", contexto: "",
        inicio: null, fin: null,
        tareas: [
          { t: "PRD_Entrega del cliente plantilla de migración Activos Fijos diligenciada", ini: null, fin: null, resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Activos Fijos BD Principal", ini: null, fin: null, resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantilla de migración Activos Fijos", ini: null, fin: null, resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantilla Activos Fijos BD Principal", ini: null, fin: null, resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Consultoría Final A&F", contexto: "",
        inicio: null, fin: null,
        tareas: [
          { t: "Sesión de Consultoría final A&F", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 4 · A&F — BD Secundaria 1", etapa: "HABILITAR", inicio: "2026-11-05", fin: "2027-01-20",
    fases: [
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-11-05", fin: "2026-12-22",
        tareas: [
          { t: "Creación BD Sec1 en ambiente de producción", ini: "2026-11-05", fin: "2026-12-01", resp: "SINCOSOFT", ctx: "" },
          { t: "Salida a Producción Sec1", ini: "2026-12-22", fin: "2026-12-22", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Parametrización Ambiente de Producción", contexto: "",
        inicio: "2026-12-04", fin: "2026-12-11",
        tareas: [
          { t: "PRD_Entrega de plantilla de migracion Centros de Costos Sec1 diligenciada", ini: "2026-12-04", fin: "2026-12-04", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Centros de Costos Sec1", ini: "2026-12-07", fin: "2026-12-07", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Ajuste y envío de plantilla de migración Centros de Costos Sec1", ini: "2026-12-09", fin: "2026-12-09", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Migración de plantilla Centros de Costos Sec1", ini: "2026-12-10", fin: "2026-12-10", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "Acompañamiento Configuraciones iniciales (Causación, Pagos, Facturación) Sec1", ini: "2026-12-11", fin: "2026-12-11", resp: "SINCOSOFT - MESSINA", ctx: "Prametrizaciones Generales" },
        ],
      },
      {
        titulo: "Migración Saldos CXP y CXC a Producción", contexto: "",
        inicio: "2026-12-14", fin: "2026-12-18",
        tareas: [
          { t: "PRD_Entrega de plantillas de migración Saldos CXP y CXC Sec1 diligenciadas", ini: "2026-12-14", fin: "2026-12-14", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos CXC y CXP Sec1", ini: "2026-12-15", fin: "2026-12-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantillas de migración saldos CXC y CXP Sec1", ini: "2026-12-16", fin: "2026-12-16", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantillas saldos CXC y CXP Sec1", ini: "2026-12-18", fin: "2026-12-18", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Migración Históricos en Producción A&F", contexto: "",
        inicio: "2026-12-28", fin: "2027-01-14",
        tareas: [
          { t: "PRD_Entrega final plantillas de migración Saldos Iniciales Sec1 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos Iniciales Sec1", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Ajuste y envío de plantillas de migración Saldos Iniciales Sec1", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Migración plantillas Saldos Iniciales Sec1", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Entrega final plantillas de migración Movimientos Mes a Mes Sec1 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Movimientos Mes a Mes Sec1", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Ajuste y envío de plantillas de migración Movimientos Mes a Mes Sec1", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Migración plantillas Movimientos Mes a Mes Sec1", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
        ],
      },
      {
        titulo: "Migración de Activos Fijos a Producción", contexto: "",
        inicio: "2027-01-13", fin: "2027-01-20",
        tareas: [
          { t: "PRD_Entrega del cliente plantilla de migración Activos Fijos Sec1 diligenciada", ini: "2027-01-13", fin: "2027-01-13", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Activos Fijos Sec1", ini: "2027-01-14", fin: "2027-01-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantilla de migración Activos Fijos Sec1", ini: "2027-01-18", fin: "2027-01-19", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantilla Activos Fijos Sec1", ini: "2027-01-20", fin: "2027-01-20", resp: "SINCOSOFT", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 5 · A&F — BD Secundaria 2", etapa: "HABILITAR", inicio: "2026-11-05", fin: "2027-01-20",
    fases: [
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-11-05", fin: "2026-12-22",
        tareas: [
          { t: "Creación BD Sec1 en ambiente de producción", ini: "2026-11-05", fin: "2026-12-01", resp: "SINCOSOFT", ctx: "" },
          { t: "Salida a Producción Sec2", ini: "2026-12-22", fin: "2026-12-22", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Parametrización Ambiente de Producción", contexto: "",
        inicio: "2026-12-04", fin: "2026-12-11",
        tareas: [
          { t: "PRD_Entrega de plantilla de migracion Centros de Costos Sec2 diligenciada", ini: "2026-12-04", fin: "2026-12-04", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Centros de Costos Sec2", ini: "2026-12-07", fin: "2026-12-07", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Ajuste y envío de plantilla de migración Centros de Costos Sec2", ini: "2026-12-09", fin: "2026-12-09", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Migración de plantilla Centros de Costos Sec2", ini: "2026-12-10", fin: "2026-12-10", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "Acompañamiento Configuraciones iniciales (Causación, Pagos, Facturación) Sec2", ini: "2026-12-11", fin: "2026-12-11", resp: "SINCOSOFT - MESSINA", ctx: "Prametrizaciones Generales" },
        ],
      },
      {
        titulo: "Migración Saldos CXP y CXC a Producción", contexto: "",
        inicio: "2026-12-14", fin: "2026-12-18",
        tareas: [
          { t: "PRD_Entrega de plantillas de migración Saldos CXP y CXC Sec2 diligenciadas", ini: "2026-12-14", fin: "2026-12-14", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos CXC y CXP Sec2", ini: "2026-12-15", fin: "2026-12-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantillas de migración saldos CXC y CXP Sec2", ini: "2026-12-16", fin: "2026-12-16", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantillas saldos CXC y CXP Sec2", ini: "2026-12-18", fin: "2026-12-18", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Migración Históricos en Producción A&F", contexto: "",
        inicio: "2026-12-28", fin: "2027-01-14",
        tareas: [
          { t: "PRD_Entrega final plantillas de migración Saldos Iniciales Sec2 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos Iniciales Sec2", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Ajuste y envío de plantillas de migración Saldos Iniciales Sec2", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Migración plantillas Saldos Iniciales Sec2", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Entrega final plantillas de migración Movimientos Mes a Mes Sec2 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Movimientos Mes a Mes Sec2", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Ajuste y envío de plantillas de migración Movimientos Mes a Mes Sec2", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Migración plantillas Movimientos Mes a Mes Sec2", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
        ],
      },
      {
        titulo: "Migración de Activos Fijos a Producción", contexto: "",
        inicio: "2027-01-13", fin: "2027-01-20",
        tareas: [
          { t: "PRD_Entrega del cliente plantilla de migración Activos Fijos Sec2 diligenciada", ini: "2027-01-13", fin: "2027-01-13", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Activos Fijos Sec2", ini: "2027-01-14", fin: "2027-01-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantilla de migración Activos Fijos Sec2", ini: "2027-01-18", fin: "2027-01-19", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantilla Activos Fijos Sec2", ini: "2027-01-20", fin: "2027-01-20", resp: "SINCOSOFT", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 6 · A&F — BD Secundaria 3", etapa: "HABILITAR", inicio: "2026-11-05", fin: "2027-01-20",
    fases: [
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-11-05", fin: "2026-12-22",
        tareas: [
          { t: "Creación BD Sec1 en ambiente de producción", ini: "2026-11-05", fin: "2026-12-01", resp: "SINCOSOFT", ctx: "" },
          { t: "Salida a Producción Sec3", ini: "2026-12-22", fin: "2026-12-22", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Parametrización Ambiente de Producción", contexto: "",
        inicio: "2026-12-04", fin: "2026-12-11",
        tareas: [
          { t: "PRD_Entrega de plantilla de migracion Centros de Costos Sec3 diligenciada", ini: "2026-12-04", fin: "2026-12-04", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Centros de Costos Sec3", ini: "2026-12-07", fin: "2026-12-07", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Ajuste y envío de plantilla de migración Centros de Costos Sec3", ini: "2026-12-09", fin: "2026-12-09", resp: "MESSINA", ctx: "Migración Maestros a Producción" },
          { t: "PRD_Migración de plantilla Centros de Costos Sec3", ini: "2026-12-10", fin: "2026-12-10", resp: "SINCOSOFT", ctx: "Migración Maestros a Producción" },
          { t: "Acompañamiento Configuraciones iniciales (Causación, Pagos, Facturación) Sec3", ini: "2026-12-11", fin: "2026-12-11", resp: "SINCOSOFT - MESSINA", ctx: "Prametrizaciones Generales" },
        ],
      },
      {
        titulo: "Migración Saldos CXP y CXC a Producción", contexto: "",
        inicio: "2026-12-14", fin: "2026-12-18",
        tareas: [
          { t: "PRD_Entrega de plantillas de migración Saldos CXP y CXC Sec3 diligenciadas", ini: "2026-12-14", fin: "2026-12-14", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos CXC y CXP Sec3", ini: "2026-12-15", fin: "2026-12-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantillas de migración saldos CXC y CXP Sec3", ini: "2026-12-16", fin: "2026-12-16", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantillas saldos CXC y CXP Sec3", ini: "2026-12-18", fin: "2026-12-18", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Migración Históricos en Producción A&F", contexto: "",
        inicio: "2026-12-28", fin: "2027-01-14",
        tareas: [
          { t: "PRD_Entrega final plantillas de migración Saldos Iniciales Sec3 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Saldos Iniciales Sec3", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Ajuste y envío de plantillas de migración Saldos Iniciales Sec3", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Migración plantillas Saldos Iniciales Sec3", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Saldos Iniciales Principal y Fiscal 31/12" },
          { t: "PRD_Entrega final plantillas de migración Movimientos Mes a Mes Sec3 diligenciadas", ini: "2026-12-28", fin: "2026-12-28", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Revisión y retroalimentación de plantillas de migración Movimientos Mes a Mes Sec3", ini: "2026-12-29", fin: "2027-01-05", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Ajuste y envío de plantillas de migración Movimientos Mes a Mes Sec3", ini: "2027-01-06", fin: "2027-01-13", resp: "MESSINA", ctx: "Movimientos Mes a Mes" },
          { t: "PRD_Migración plantillas Movimientos Mes a Mes Sec3", ini: "2027-01-14", fin: "2027-01-14", resp: "SINCOSOFT", ctx: "Movimientos Mes a Mes" },
        ],
      },
      {
        titulo: "Migración de Activos Fijos a Producción", contexto: "",
        inicio: "2027-01-13", fin: "2027-01-20",
        tareas: [
          { t: "PRD_Entrega del cliente plantilla de migración Activos Fijos Sec3 diligenciada", ini: "2027-01-13", fin: "2027-01-13", resp: "MESSINA", ctx: "" },
          { t: "PRD_Revisión y retroalimentación de plantilla de migración Activos Fijos Sec3", ini: "2027-01-14", fin: "2027-01-15", resp: "SINCOSOFT", ctx: "" },
          { t: "PRD_Ajuste y envío de plantilla de migración Activos Fijos Sec3", ini: "2027-01-18", fin: "2027-01-19", resp: "MESSINA", ctx: "" },
          { t: "PRD_Migración de plantilla Activos Fijos Sec3", ini: "2027-01-20", fin: "2027-01-20", resp: "SINCOSOFT", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 7 · Facturación electrónica", etapa: "HABILITAR", inicio: "2026-09-11", fin: "2026-12-03",
    fases: [
      {
        titulo: "BD Principal - Constructora Messina García", contexto: "",
        inicio: "2026-09-11", fin: "2026-11-05",
        tareas: [
          { t: "Revisón Representación impresa", ini: "2026-09-11", fin: "2026-09-11", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Contextulización contable DGC", ini: "2026-09-17", fin: "2026-09-17", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Capacitación Emisión DGC", ini: "2026-09-23", fin: "2026-09-25", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Acompañamiento Certificación DGII Sesión I", ini: "2026-10-01", fin: "2026-10-01", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Acompañamiento Certificación DGII Sesión II", ini: "2026-10-14", fin: "2026-10-14", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Acompañamiento Salida a producción DGC", ini: "2026-10-20", fin: "2026-10-20", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Acta de Acompañamiento Salida a Producción DGC", ini: "2026-10-23", fin: "2026-10-23", resp: "SINCOSOFT - MESSINA", ctx: "Documento de Gastos y Compras" },
          { t: "Contextulización contable FE", ini: "2026-09-28", fin: "2026-09-28", resp: "SINCOSOFT - MESSINA", ctx: "Emisión de Facturas" },
          { t: "Capacitación Emisión FE", ini: "2026-09-29", fin: "2026-09-29", resp: "SINCOSOFT - MESSINA", ctx: "Emisión de Facturas" },
          { t: "Acompañamiento Salida a producción FE", ini: "2026-10-20", fin: "2026-10-20", resp: "SINCOSOFT - MESSINA", ctx: "Emisión de Facturas" },
          { t: "Acta de Acompañamiento Salida a Producción FE", ini: "2026-10-23", fin: "2026-10-23", resp: "SINCOSOFT - MESSINA", ctx: "Emisión de Facturas" },
          { t: "Capacitación Procesamiento de documentos electrónicos", ini: "2026-10-27", fin: "2026-10-27", resp: "SINCOSOFT - MESSINA", ctx: "Recepción de Facturas" },
          { t: "Capacitación Integraciones con SINCO ERP", ini: "2026-11-05", fin: "2026-11-05", resp: "SINCOSOFT - MESSINA", ctx: "Recepción de Facturas" },
        ],
      },
      {
        titulo: "BD Secundaria 1", contexto: "",
        inicio: "2026-12-02", fin: "2026-12-03",
        tareas: [
          { t: "Activación DGC, FE, y RE Sec1", ini: "2026-12-02", fin: "2026-12-02", resp: "SINCOSOFT", ctx: "" },
          { t: "Certificación DGII DGC y FE Sec1 por el cliente", ini: "2026-12-03", fin: "2026-12-03", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "BD Secundaria 2", contexto: "",
        inicio: "2026-12-02", fin: "2026-12-03",
        tareas: [
          { t: "Activación DGC, FE, y RE Sec2", ini: "2026-12-02", fin: "2026-12-02", resp: "SINCOSOFT", ctx: "" },
          { t: "Certificación DGII DGC y FE Sec2 por el cliente", ini: "2026-12-03", fin: "2026-12-03", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "BD Secundaria 3", contexto: "",
        inicio: "2026-12-02", fin: "2026-12-03",
        tareas: [
          { t: "Activación DGC, FE, y RE Sec3", ini: "2026-12-02", fin: "2026-12-02", resp: "SINCOSOFT", ctx: "" },
          { t: "Certificación DGII DGC y FE Sec3 por el cliente", ini: "2026-12-03", fin: "2026-12-03", resp: "MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 8 · ADPRO (Proyectos de obra)", etapa: "HABILITAR", inicio: "2026-08-21", fin: "2026-11-24",
    fases: [
      {
        titulo: "Migración Plantilla de Maestros", contexto: "",
        inicio: "2026-08-21", fin: "2026-09-04",
        tareas: [
          { t: "PRB_Entrega final de plantilla de migración", ini: "2026-08-21", fin: "2026-08-21", resp: "MESSINA", ctx: "" },
          { t: "PRB_Revisión y validación de plantilla maestros", ini: "2026-08-24", fin: "2026-08-25", resp: "SINCOSOFT", ctx: "" },
          { t: "PRB_Ajustes a plantilla cliente", ini: "2026-08-28", fin: "2026-08-28", resp: "MESSINA", ctx: "" },
          { t: "PRB_Migración de maestros", ini: "2026-09-04", fin: "2026-09-04", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2026-08-31", fin: "2026-11-24",
        tareas: [
          { t: "Envio de temarios y programación de capacitaciones", ini: "2026-08-31", fin: "2026-08-31", resp: "SINCOSOFT", ctx: "" },
          { t: "Preparación de entorno para capacitaciones", ini: "2026-09-07", fin: "2026-09-07", resp: "SINCOSOFT", ctx: "" },
          { t: "Estructuracion y creación de usuarios y perfiles en ambiente de producción por el cliente", ini: "2026-10-30", fin: "2026-10-30", resp: "MESSINA", ctx: "" },
          { t: "Sesión acompañamiento después de salida a producción", ini: "2026-11-23", fin: "2026-11-23", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Preparación de entorno para capacitaciones segundo nivel", ini: "2026-11-24", fin: "2026-11-24", resp: "SINCOSOFT", ctx: "" },
          { t: "Acta Sesiones de Consultoría Firmadas", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Capacitaciones Operativas ADPRO", contexto: "",
        inicio: "2026-09-10", fin: "2026-11-05",
        tareas: [
          { t: "Capacitación y práctica Presupuesto Sesión I", ini: "2026-09-10", fin: "2026-09-10", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Presupuesto" },
          { t: "Capacitación y práctica Presupuesto Sesión II", ini: "2026-09-11", fin: "2026-09-11", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Presupuesto" },
          { t: "Capacitación y práctica Presupuesto Sesión III", ini: "2026-09-22", fin: "2026-09-22", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Presupuesto" },
          { t: "Capacitación y práctica Presupuesto Sesión IV", ini: "2026-09-23", fin: "2026-09-23", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Presupuesto" },
          { t: "Capacitación y práctica Presupuesto Sesión V", ini: "2026-09-25", fin: "2026-09-25", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Presupuesto" },
          { t: "Presupueto piloto montado en el ambiente de pruebas por el cliente", ini: "2026-10-02", fin: "2026-10-02", resp: "MESSINA", ctx: "" },
          { t: "Acompañamiento migración plantilla de presupuesto (Si aplica)", ini: "2026-10-01", fin: "2026-10-01", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación en Almacén Sesión I", ini: "2026-10-05", fin: "2026-10-05", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación en Almacén Sesión II", ini: "2026-10-06", fin: "2026-10-06", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación en Almacén Sesión III", ini: "2026-10-13", fin: "2026-10-13", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación en Almacén Sesión IV", ini: "2026-10-14", fin: "2026-10-14", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación en Almacén Sesión V", ini: "2026-10-15", fin: "2026-10-15", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación en Almacén Sesión VI", ini: "2026-10-19", fin: "2026-10-19", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Contratos y Actas de obra Sesión I", ini: "2026-10-20", fin: "2026-10-20", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Contratos y Actas de obra Sesión II", ini: "2026-10-21", fin: "2026-10-21", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Contratos y Actas de obra Sesión III", ini: "2026-10-22", fin: "2026-10-22", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Contratos y Actas de obra Sesión IV", ini: "2026-10-26", fin: "2026-10-26", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Proyección de costos Sesión I", ini: "2026-10-27", fin: "2026-10-27", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Capacitación Configuración contable ADPRO", ini: "2026-10-30", fin: "2026-10-30", resp: "SINCOSOFT - MESSINA", ctx: "Capacitaciones Almacén, Contratos, Proyección y Conf. Contable" },
          { t: "Registro de Asistencia a Capacitaciones Operativas", ini: "2026-11-05", fin: "2026-11-05", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Estructuración plan de salida a producción", ini: "2026-10-28", fin: "2026-10-28", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Diligenciamiento encuestas Almacén y Contratos", ini: "2026-11-03", fin: "2026-11-03", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Actualización Entorno Productivo Salida a Producción", contexto: "",
        inicio: "2026-10-28", fin: "2026-11-06",
        tareas: [
          { t: "Entrega datos cuenta de correo electrónico envío orden de compra", ini: "2026-10-30", fin: "2026-10-30", resp: "MESSINA", ctx: "" },
          { t: "Entrega encuestas de Almacén y Contratos diligenciadas", ini: "2026-11-04", fin: "2026-11-04", resp: "MESSINA", ctx: "" },
          { t: "Configuración de correo electrónico orden de compra", ini: "2026-11-06", fin: "2026-11-06", resp: "SINCOSOFT", ctx: "" },
          { t: "Configuración encuestas de Almacén y Contratos BD Proyecta", ini: "2026-11-04", fin: "2026-11-04", resp: "SINCOSOFT", ctx: "" },
          { t: "Presupuestos definitivos por el cliente en pruebas para migrar a producción", ini: "2026-10-28", fin: "2026-10-28", resp: "MESSINA", ctx: "" },
          { t: "Copia maestros y presupuesto proyecto piloto en producción", ini: "2026-10-30", fin: "2026-10-30", resp: "SINCOSOFT", ctx: "" },
        ],
      },
      {
        titulo: "Acompañamientos Configuraciones y Desatrase en Producción", contexto: "",
        inicio: "2026-11-04", fin: "2026-11-10",
        tareas: [
          { t: "Configuraciones básicas de proyectos BD Proyecta", ini: "2026-11-04", fin: "2026-11-04", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Desatrase de proyectos (Almacén)", ini: "2026-11-05", fin: "2026-11-05", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Desatrase de proyectos (Contratos)", ini: "2026-11-06", fin: "2026-11-06", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Configuración contable", ini: "2026-11-10", fin: "2026-11-10", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Salida a Producción ADPRO", contexto: "",
        inicio: "2026-11-11", fin: "2026-11-19",
        tareas: [
          { t: "Acompañamiento Salida a producción Almacén", ini: "2026-11-11", fin: "2026-11-12", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Salida a producción Contratos", ini: "2026-11-12", fin: "2026-11-13", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Asistencia Acompañamientos Salida a Producción", ini: "2026-11-19", fin: "2026-11-19", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Capacitaciones y Acompañamientos Segundo Nivel ADPRO", contexto: "",
        inicio: null, fin: null,
        tareas: [
          { t: "Capacitación Minutas automáticas", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Programación de obra", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Ejecución de obra Sesión I", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Proyección de costos Sesión II", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Control de obra Sesión I", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acompañamiento Programación y Ejecución de obra", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Control de obra Sesión II - Cuentas control (Si aplica)", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Ejecución de obra Sesion II - Facturación actas avance cliente (Si aplica)", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Capacitación Almacén Sesión V - Provisión de entradas y actas (Si aplica)", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Registro de Asistencia a Capacitaciones Segundo Nivel", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Consultoría Final ADPRO", contexto: "",
        inicio: null, fin: null,
        tareas: [
          { t: "Sesión de Consultoría final ADPRO", ini: null, fin: null, resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 9 · Seguimiento", etapa: "SEGUIMIENTO", inicio: "2026-05-26", fin: "2027-01-28",
    fases: [
      {
        titulo: "Cartera", contexto: "",
        inicio: "2026-05-26", fin: "2026-10-22",
        tareas: [
          { t: "Cuota 1 - 20% a la firma del contrato", ini: "2026-05-26", fin: "2026-05-26", resp: "MESSINA", ctx: "" },
          { t: "Cuota 2", ini: "2026-06-24", fin: "2026-06-24", resp: "MESSINA", ctx: "" },
          { t: "Cuota 3", ini: "2026-07-24", fin: "2026-07-24", resp: "MESSINA", ctx: "" },
          { t: "Cuota 4", ini: "2026-08-25", fin: "2026-08-25", resp: "MESSINA", ctx: "" },
          { t: "Cuota 5", ini: "2026-09-22", fin: "2026-09-22", resp: "MESSINA", ctx: "" },
          { t: "Cuota 6", ini: "2026-10-22", fin: "2026-10-22", resp: "MESSINA", ctx: "" },
        ],
      },
      {
        titulo: "Reuniones de Seguimiento", contexto: "",
        inicio: "2026-09-22", fin: "2027-01-28",
        tareas: [
          { t: "Seguimiento de Proyecto 1", ini: "2026-09-22", fin: "2026-09-22", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Seguimiento de Proyecto 2", ini: "2026-11-23", fin: "2026-11-23", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Seguimiento de Proyecto 3", ini: "2027-01-22", fin: "2027-01-22", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Actas de Reuniones de Seguimiento", ini: "2027-01-28", fin: "2027-01-28", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
  {
    titulo: "SINCO 10 · Cierre", etapa: "CIERRE", inicio: "2027-02-11", fin: "2027-02-11",
    fases: [
      {
        titulo: "Hitos y entregables", contexto: "actas, firmas y aprobaciones de esta etapa",
        inicio: "2027-02-11", fin: "2027-02-11",
        tareas: [
          { t: "Reunión de cierre del proyecto", ini: "2027-02-11", fin: "2027-02-11", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Acta de cierre", ini: "2027-02-11", fin: "2027-02-11", resp: "SINCOSOFT - MESSINA", ctx: "" },
          { t: "Testimonio", ini: "2027-02-11", fin: "2027-02-11", resp: "SINCOSOFT - MESSINA", ctx: "" },
        ],
      },
    ],
  },
];
