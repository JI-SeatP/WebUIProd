export interface CorrectionData {
  TJSEQ: number;
  TRANSAC: number;
  NO_PROD: string;
  NOM_CLIENT: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  TJDEBUT: string;
  TJFIN: string;
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
  ENTREPF: number;
  QTE_BONNE: number;
  QTE_DEFAUT: number;
  defects: CorrectionDefect[];
  finishedProducts: CorrectionFinishedProduct[];
  materials: CorrectionMaterial[];
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
}

export interface NewDefectRow {
  tempId: number;
  qty: string;
  typeId: string;
}
