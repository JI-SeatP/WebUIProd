import type { PressLabelData } from "@/types/modals";

interface PressingLabelProps {
  data: PressLabelData;
  opcode: string;
}

function getShiftLabel(eqDebutQuart: string, descriptionP: string): string {
  if (!eqDebutQuart) return descriptionP || "";
  try {
    const d = new Date(eqDebutQuart);
    const h = d.getHours();
    const m = d.getMinutes();
    const totalMin = h * 60 + m;
    let shift = "";
    if (totalMin >= 420 && totalMin < 930) shift = "SHIFT 1";       // 07:00–15:29
    else if (totalMin >= 930 && totalMin < 1440) shift = "SHIFT 2";  // 15:30–23:59
    else shift = "SHIFT 3";                                           // 00:00–06:59
    return descriptionP ? `${descriptionP} - ${shift}` : shift;
  } catch {
    return descriptionP || "";
  }
}

function getItemCode(data: PressLabelData): string {
  if (!data.PRODUIT_CODE || data.PRODUIT_CODE.trim() === "") {
    return data.NO_INVENTAIRE || "";
  }
  return data.PRODUIT_CODE;
}

const TITLE_MAP: Record<string, string> = {
  PRESS: "PRESSAGE / PRESSING",
  CNC: "MACHINAGE / MACHINING",
  PACK: "EMBALLAGE / PACKAGING",
};

/* ── Size constants ──────────────────────────────────────── */
/* 4in × 6in at 96 DPI = 384px × 576px                      */
const PAGE_W = 384;
const PAGE_H = 576;
const GAP = 7;       // 0.075in ≈ 7.2px → 7px
const RADIUS = "6pt";

/* Font sizes (pt values render 1:1 as px in browser CSS) */
const TITLE_SZ = "8.5pt";
const VAL = {
  NO_PROD: "26pt",
  NOM_CLIENT: "16pt",
  Panneau: "17pt",
  itemCode: "17pt",
  QTE_PRODUITE: "22pt",
  PRODUIT_S: "14pt",
} as const;

export function PressingLabel({ data, opcode }: PressingLabelProps) {
  const now = new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const printDate = `${MONTHS[now.getMonth()]}-${String(now.getDate()).padStart(2,"0")}-${now.getFullYear()}`;
  const printTime = now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
  const title = TITLE_MAP[opcode] ?? `${opcode}`;
  const shiftLabel = getShiftLabel(data.EQDEBUTQUART, data.DeDescription_P);
  const itemCode = getItemCode(data);

  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        padding: `${GAP}px`,
        fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
        backgroundColor: "#fff",
        color: "#000",
        lineHeight: 1.3,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ── Header: logo + label number ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px" }}>
        <img src="/logo-seatply.png" alt="SeatPly" style={{ height: "36px" }} />
        <div style={{ textAlign: "right", fontSize: TITLE_SZ }}>
          <div>Label # / numéro d'étiquette:</div>
          <div style={{ fontSize: "26pt", fontWeight: 700, lineHeight: 1 }}>{data.NOPSEQ}</div>
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "14pt", marginBottom: "4px" }}>
        {title}
      </div>

      {/* ── Main bordered section ── */}
      <div
        style={{
          border: "1.5px solid #000",
          borderRadius: RADIUS,
          padding: "6px 8px",
          marginBottom: "4px",
        }}
      >
        {/* WO + Ordered/ToShip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: TITLE_SZ }}>BC / WO #</div>
            <div style={{ fontSize: VAL.NO_PROD, fontWeight: 700, lineHeight: 1.1 }}>{data.NO_PROD}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: TITLE_SZ }}>
            <div>Commandé / <b>à Expédier</b></div>
            <div>Ordered / <b>To Ship</b></div>
            <div style={{ fontSize: "16pt", lineHeight: 1.1 }}>
              <span>{data.QTE_COMMANDEE}/</span>{" "}
              <span style={{ fontWeight: 700 }}>{data.QTE_A_LIVRER}</span>
              <span style={{ fontSize: "10pt" }}> pcs</span>
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginTop: "6px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Client / Customer:</div>
          <div style={{
            fontSize: VAL.NOM_CLIENT, fontWeight: 700, lineHeight: 1.1,
            height: "35.2pt", overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{data.NOM_CLIENT}</div>
        </div>

        {/* Panel */}
        <div style={{ marginTop: "6px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Panneau / Panel #:</div>
          <div style={{ fontSize: VAL.Panneau, fontWeight: 700, lineHeight: 1.1 }}>{data.Panneau}</div>
        </div>

        {/* Product / Item */}
        <div style={{ marginTop: "4px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Produit / Item #:</div>
          <div style={{ fontSize: VAL.itemCode, lineHeight: 1.1 }}>{itemCode}</div>
          <div style={{
            fontSize: VAL.PRODUIT_S, lineHeight: 1.1,
            height: "30.8pt", overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{data.PRODUIT_S ?? ""}</div>
        </div>

        {/* Version + Shift + Category */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginTop: "6px", fontSize: "10pt" }}>
          <div>
            <span>Ver: </span>
            <span style={{ fontWeight: 700, fontSize: "14pt" }}>{data.REVISION}</span>
          </div>
          <div>{shiftLabel}</div>
          <div>{data.SCDESC_S}</div>
        </div>
      </div>

      {/* ── Date / Qty / Presses row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto",
        gridTemplateRows: "auto 1fr",
        columnGap: "4px",
        rowGap: "2px",
        marginBottom: "4px",
      }}>
        {/* Titles — row 1, all same height, bottom-aligned */}
        <div style={{ fontSize: TITLE_SZ, textAlign: "center", alignSelf: "end" }}>Date</div>
        <div style={{ fontSize: TITLE_SZ, textAlign: "center", alignSelf: "end" }}>Qté Contenant / Qty in Skid</div>
        <div style={{ fontSize: TITLE_SZ, textAlign: "center", alignSelf: "end" }}>Presses</div>
        {/* Boxes — row 2, all same height via grid */}
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, textAlign: "center", padding: "3px 4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "14pt", fontWeight: 700, lineHeight: 1.1 }}>{printDate}</div>
          <div style={{ fontSize: "9pt", color: "#666" }}>{printTime}</div>
        </div>
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, textAlign: "center", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: VAL.QTE_PRODUITE, fontWeight: 700, lineHeight: 1 }}>
            {data.QTE_PRODUITE}
            <span style={{ fontSize: "10pt", fontWeight: 400 }}> pcs</span>
          </div>
        </div>
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, textAlign: "center", padding: "3px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: "20pt", fontWeight: 700, lineHeight: 1.1 }}>{data.Presses}</div>
        </div>
      </div>

      {/* ── Operator box ── */}
      <div style={{ marginBottom: "4px" }}>
        <div style={{ fontSize: TITLE_SZ }}>Opérateur / Operator :</div>
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, height: "32px", padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(data.EMPLOYE_EMNO || data.EMPLOYE_EMNOM) && (
            <span style={{ fontSize: "13pt" }}>
              {[data.EMPLOYE_EMNO, data.EMPLOYE_EMNOM].filter(Boolean).join(" - ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Next Operation ── */}
      <div>
        <div style={{ fontSize: TITLE_SZ }}>Operation Suivante / Next Operation :</div>
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: RADIUS,
            textAlign: "center",
            padding: "4px 6px",
          }}
        >
          <div style={{ fontSize: "15pt", fontWeight: 700, lineHeight: 1.1 }}>
            {(data.NEXTOPERATION_P || "").toUpperCase()}
          </div>
          <div style={{ fontSize: "12pt" }}>{data.NEXTOPERATION_S}</div>
        </div>
      </div>
    </div>
  );
}
