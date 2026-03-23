export interface CorrectionData {
  TJSEQ: number;
  TRANSAC: number;
  NO_PROD: string;
  NOM_CLIENT: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  TJDEBUT: string; // ISO datetime-local format "yyyy-MM-ddTHH:mm"
  TJFIN: string;   // ISO datetime-local format "yyyy-MM-ddTHH:mm"
  TJDUREE: number;
  EMNOM: string;
  EMNOIDENT: number;
  MACODE: string;
  MACHINE_P: string;
  MACHINE_S: string;
  DECODE: string;
  OPERATION_P: string;
  OPERATION_S: string;
  MODEPROD_MPCODE: string;
  MODEPROD: number;
  ENTREPF: number;
  QTE_BONNE: number;
  QTE_DEFAUT: number;
  // Fields needed for backend submit
  CNOMENCOP: number;
  CNOMENCLATURE: number;
  INVENTAIRE_C: number;
  SMNOTRANS: string;
  EMPLOYE_EMNO: string;
  OPERATION_SEQ: number;
  MACHINE_SEQ: number;
  FMCODE: string;
  EST_VCUT: number;
  // Nested data
  defects: CorrectionDefect[];
  finishedProducts: CorrectionFinishedProduct[];
  materials: CorrectionMaterial[];
  // Dropdown options
  operations: CorrectionOperation[];
  machines: CorrectionMachine[];
}

export interface CorrectionDefect {
  id: number;
  typeId: number;
  type_P: string;
  type_S: string;
  originalQty: number;
  correctedQty: number;
}

export interface CorrectionFinishedProduct {
  id: number;
  product: string;
  container: string;
  originalQty: number;
  correctedQty: number;
}

export interface CorrectionMaterial {
  id: number;
  code: string;
  description_P: string;
  description_S: string;
  unit_P: string;
  unit_S: string;
  warehouse: string;
  warehouse_P: string;
  warehouse_S: string;
  originalQty: number;
  correctedQty: number;
  niqte: number; // BOM ratio from cNOMENCLATURE — used by calculeQteSM
}

export interface CorrectionOperation {
  OPSEQ: number;
  OPCODE: string;
  OPDESC_P: string;
  OPDESC_S: string;
}

export interface CorrectionMachine {
  MASEQ: number;
  MACODE: string;
  MADESC_P: string;
  MADESC_S: string;
}

export interface NewDefectRow {
  tempId: number;
  qty: string;
  typeId: string;
}
