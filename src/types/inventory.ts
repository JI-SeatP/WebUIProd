export interface InventoryTransaction {
  TRSEQ: number;
  TRNO: string;
  PRODUIT_CODE: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  ENTREPOT_CODE: string;
  ENTREPOT_P: string;
  ENTREPOT_S: string;
  QTE_ESTIMEE: number;
  QTE_REELLE: number;
  UNITE: string;
  DATE_VERIF: string;
}

export interface ContainerDetail {
  CDSEQ: number;
  CONTAINER: string;
  PRODUIT_CODE: string;
  PRODUIT_P: string;
  PRODUIT_S: string;
  QTE_ESTIMEE: number;
  QTE_REELLE: number;
  UNITE: string;
}
