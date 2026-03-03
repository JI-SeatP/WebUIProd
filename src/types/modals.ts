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
