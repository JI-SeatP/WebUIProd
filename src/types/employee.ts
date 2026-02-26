export interface Employee {
  EMSEQ: number;
  EMNO: number;
  EMNOM: string;
  EMACTIF: number;
  EMNOIDENT: number;
  MACHINE: number | null;
  EMEMAIL: string | null;
  EQUIPE: number;
  NOMEQUIPE_P: string;
  NOMEQUIPE_S: string;
  EQDEBUTQUART: string;
  EQFINQUART: string;
  DEPARTEMENT: number | null;
  ENTREPOT: number | null;
  POSTE: string | null;
  Fonction_P: string | null;
  Fonction_S: string | null;
  CodeFonction: string | null;
}
