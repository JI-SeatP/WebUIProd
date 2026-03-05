export interface SkidInfo {
  SKID: string;
  PRODUIT_CODE: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  QTE: number;
  ENTREPOT_CODE: string;
  ENTREPOT_P: string;
  ENTREPOT_S: string;
}

export interface LabelInfo {
  TRANSAC: number;
  NO_PROD: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  NOM_CLIENT: string;
  QTE_PAR_SKID: number;
}

export interface FinishedProductLabel {
  CONTENANT: number;
  CON_NUMERO: string;
  NO_SERIE_NSNO_SERIE: string | null;
  DCO_QTE_INV: number;
  DTRQTE: number;
  TRSEQ_EPF: number;
  INDESC1: string;
  INDESC2: string;
  PACK_DATE: string | null;
}

export interface OperationLabel {
  TJSEQ: number;
  TRANSAC: number;
  OPERATION_OPCODE: string;
  OPERATION_OPDESC_P: string;
  OPERATION_OPDESC_S: string;
  TJDEBUTDATE: string;
  TJQTEPROD: number;
  cNomencOp_Machine: number | null;
  MACHINE_MADESC_P: string;
  MACHINE_MADESC_S: string;
}

export interface OrderLabelsResponse {
  finishedProducts: FinishedProductLabel[];
  operations: OperationLabel[];
  currentOpcode: string | null;
  noProd: string | null;
}

export interface MessageForm {
  machine: string;
  station: string;
  message: string;
}

export interface TransferInfo {
  SKID: string;
  CURRENT_ENTREPOT_CODE: string;
  CURRENT_ENTREPOT_P: string;
  CURRENT_ENTREPOT_S: string;
}
