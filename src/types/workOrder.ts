export interface WorkOrder {
  TRANSAC: number;
  COPMACHINE: number | null;
  NOPSEQ: number;
  TJSEQ: number | null;
  NO_PROD: string;
  NOM_CLIENT: string;
  CODE_CLIENT: string;
  CONOPO: string | null;
  OPERATION: string;
  OPERATION_P: string;
  OPERATION_S: string;
  OPERATION_SEQ: number;
  MACHINE: number;
  MACODE: string;
  MACHINE_P: string;
  MACHINE_S: string;
  DEPARTEMENT: number;
  DESEQ: number;
  DECODE: string;
  DeDescription_P: string;
  DeDescription_S: string;
  FAMILLEMACHINE: number;
  FMCODE: string;
  NO_INVENTAIRE: string | null;
  INVENTAIRE_SEQ: number | null;
  INVENTAIRE_P: string | null;
  INVENTAIRE_S: string | null;
  PRODUIT_CODE: string | null;
  PRODUIT_SEQ: number | null;
  PRODUIT_P: string | null;
  PRODUIT_S: string | null;
  MATERIEL_CODE: string | null;
  MATERIEL_SEQ: number | null;
  MATERIEL_P: string | null;
  MATERIEL_S: string | null;
  Panneau: string | null;
  MOULE_CODE: string | null;
  GROUPE: string | null;
  REVISION: string | null;
  DATE_DEBUT_PREVU: string | null;
  DATE_FIN_PREVU: string | null;
  TJFINDATE: string | null;
  PR_DEBUTE: number;
  PR_TERMINE: number;
  TERMINE: number | null;
  QTE_A_FAB: number;
  QTE_PRODUITE: number | null;
  QTE_RESTANTE: number | null;
  QTE_FORCEE: number | null;
  QTY_REQ: number | null;
  STATUT_CODE: number | string;
  STATUT_P: string | null;
  STATUT_S: string | null;
  DCPRIORITE: number;
  DCQTE_A_PRESSER: number | null;
  DCQTE_REJET: number | null;
  VBE_DCQTE_A_FAB: number | null;
  PCS_PER_PANEL: number | null;
  ESTKIT: number;
  ENTREPOT: number;
  ENTREPOT_CODE: string | null;
  ENTREPOT_P: string | null;
  ENTREPOT_S: string | null;
  TREPOSTER_TRANSFERT: number | null;
  // V-CUT fields
  VCUT_INNOINV: string | null;
  VCUT_INDESC1: string | null;
  VCUT_INDESC2: string | null;
  VCUT_QTE_UTILISEE: number | null;
  // Big sheet inventory info
  BIGSHEET_INNOINV: string | null;
  BIGSHEET_INDESC1: string | null;
  BIGSHEET_INDESC2: string | null;
}

export interface StepImage {
  descP: string;
  descS: string;
  url: string;
}

export interface StepDetails {
  images: StepImage[];
}

export interface OperationStep {
  METSEQ: number;
  METNUMERO: number;
  METDESC_P: string;
  METDESC_S: string;
  METFICHIER_PDF_P: string | null;
  METFICHIER_PDF_S: string | null;
  METVIDEO_P: string | null;
  METVIDEO_S: string | null;
  METRTF_P: string | null;
  METRTF_S: string | null;
  IMAGE_COUNT: number;
}

export interface OperationComponent {
  NISEQ: number;
  NIQTE: number;
  NILONGUEUR: number;
  NILARGEUR: number;
  NIEPAISSEUR: number;
  INVENTAIRE_M_INNOINV: string;
  INVENTAIRE_M_INDESC1: string;
  INVENTAIRE_M_INDESC2: string;
  SPECIES: string;
  GRADE: string;
  CUT: string;
  NIVALEUR_CHAR1: string | null;
  NIVALEUR_CHAR2: string | null;
  NIVALEUR_CHAR3: string | null;
}

export interface OrderOperation {
  TRANSAC: number;
  COPMACHINE: number | null;
  OPERATION_SEQ: number;
  OPERATION_P: string;
  OPERATION_S: string;
  MACHINE_P: string;
  MACHINE_S: string;
  FMCODE: string;
}

export interface OperationAccessory {
  qty: number;
  description_fr: string | null;
  description_en: string | null;
}

export interface WorkOrderDetail {
  TRANSAC: number;
  COPMACHINE: number | null;
  NOPSEQ: number;
  NO_PROD: string;
  DCQTE_A_FAB: number;
  DCQTE_A_PRESSER: number;
  DCQTE_PRESSED: number;
  DCQTE_PENDING_TO_PRESS: number;
  DCQTE_PENDING_TO_MACHINE: number;
  DCQTE_FINISHED: number;
  DCQTE_REJET: number;
  PCS_PER_PANEL: number | null;
  NOPQTESCRAP: number | null;
  CONOPO: string | null;
  SHARE_PRESSING: number | null;
  PAGE_COMPO: string | null;
  Panel_NiSeq: number;
  PANEL_SOURCE: string | null;
  PV_PANEAU: string | null;
  steps: OperationStep[];
}

export interface VcutComponent {
  NISEQ: number;
  NIQTE: number;
  INVENTAIRE_M: number;
  INVENTAIRE_M_INNOINV: string;
  INDESC1: string;
  INDESC2: string;
  NIVALEUR_CHAR1: string | null;
  QTY_REQ: number;
  NILONGUEUR: number;
  NILARGEUR: number;
  totalProd: number;
  totalDefect: number;
  totalBigSheet: number;
}

export interface VcutContainer {
  CONTENANT_CON_NUMERO: string;
  DTRQTE: number;
  ENTREPOT_ENCODE: string;
  ENDESC_P: string;
  ENDESC_S: string;
  SPECIE: string | null;
  GRADE: string | null;
  THICKNESS: string | null;
  CUT: string | null;
  LONGUEUR: number | null;
  LARGEUR: number | null;
}

export interface VcutData {
  components: VcutComponent[];
  containers: VcutContainer[];
  qteForcee: number;
  qteUtilisee: number;
  bigsheetDesc_P: string | null;
  bigsheetDesc_S: string | null;
  bigsheetCode: string | null;
  vcutDesc_P: string | null;
  vcutDesc_S: string | null;
}
