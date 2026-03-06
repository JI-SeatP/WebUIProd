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
  INNOINV: string;
  INDESC1: string;
  INDESC2: string;
  PACK_DATE: string | null;
}

export interface PackLabelData {
  TRSEQ: number;
  CON_SEQ: number;
  CON_NUMERO: string;
  DCO_QTE_INV: number;
  NO_SERIE_NSNO_SERIE: string | null;
  INNOINV: string;
  CLIENT_CLNOM: string;
  CONOPO: string | null;
  TRNO: string;
  TRITEM: string;
  PRIXCLIENT_PPINNOINV: string | null;
  INVENTAIRE_INDESC1: string;
  INVENTAIRE_INDESC2: string;
  INVENTAIRE_INDESC3: string | null;
  DCO_SEQ: number;
  CO_TRSEQ: number;
}

export interface OperationLabel {
  TJSEQ: number;
  TRANSAC: number;
  CNOMENCOP: number;
  OPERATION_OPCODE: string;
  OPERATION_OPDESC_P: string;
  OPERATION_OPDESC_S: string;
  TJDEBUTDATE: string;
  TJFINDATE: string | null;
  TIME: string | null;
  TJQTEPROD: number;
  cNomencOp_Machine: number | null;
  MACHINE_MADESC_P: string;
  MACHINE_MADESC_S: string;
  EMPLOYE_EMNO: number | null;
  EMPLOYE_EMNOM: string | null;
}

export interface OrderLabelsResponse {
  finishedProducts: FinishedProductLabel[];
  operations: OperationLabel[];
  currentOpcode: string | null;
  noProd: string | null;
}

export interface PressLabelData {
  NOPSEQ: number;
  NO_PROD: string;
  QTE_PRODUITE: number;
  TRANSAC: number;
  NOM_CLIENT: string;
  Panneau: string;
  INVENTAIRE_S: string;
  Presses: string;
  QTE_COMMANDEE: number;
  QTE_A_LIVRER: number;
  NO_INVENTAIRE: string;
  NEXTOPERATION_S: string;
  NEXTOPERATION_P: string;
  SCDESC_S: string;
  REVISION: number;
  DeDescription_P: string;
  EQDEBUTQUART: string;
  PRODUIT_CODE: string;
  PRODUIT_S: string;
  EMPLOYE_EMNO: number | null;
  EMPLOYE_EMNOM: string | null;
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
