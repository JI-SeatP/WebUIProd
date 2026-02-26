export interface Team {
  EQSEQ: number;
  EQNOEQUIPE: string;
  EQDESC_P: string;
  EQDESC_S: string;
  EQDEBUTQUART: string;
  EQFINQUART: string;
  EQDEBUTREPAS: string | null;
  EQFINREPAS: string | null;
}

export interface EmployeeFunction {
  EFCTSEQ: number;
  EFCTCODE: string;
  EFCTDESC_P: string;
  EFCTDESC_S: string;
}
