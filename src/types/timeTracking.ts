export interface TimeEntry {
  TJSEQ: number;
  TJDATE: string;
  TJDEBUT: string;
  TJFIN: string;
  TJDUREE: number;
  STATUT_CODE: number;
  STATUT_P: string;
  STATUT_S: string;
  TRANSAC: number;
  NO_PROD: string;
  NOM_CLIENT: string;
  COPMACHINE: number;
  OPERATION_P: string;
  OPERATION_S: string;
  DEPARTEMENT: number;
  DECODE: string;
  MACODE: string;
  MACHINE_P: string;
  MACHINE_S: string;
  EMNOM: string;
  EMNOIDENT: number;
  QTE_BONNE: number;
  QTE_DEFAUT: number;
  SM_EPF: string;
  MODEPROD_MPCODE: string;
}

export interface EmployeeHours {
  employeeCode: number;
  employeeName: string;
  date: string;
  shift: number;
  startTime: string;
  endTime: string;
  department: number;
  machine: number;
  effortRate: number;
  duration: number;
  hoursWorked: number;
}

export interface TimeTrackingFilters {
  startDate: string;
  endDate: string;
  orderSearch: string;
  department: string;
  machine: string;
}

export interface SearchFilters {
  startDate: string;
  endDate: string;
  department: string;
  machine: string;
  employee: string;
}
