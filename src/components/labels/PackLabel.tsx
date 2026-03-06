import type { PackLabelData } from "@/types/modals";

interface PackLabelProps {
  data: PackLabelData;
  lang: string;
}

/* ── Size constants ──────────────────────────────────────── */
/* 4in × 6in at 96 DPI = 384px × 576px                      */
const PAGE_W = 384;
const PAGE_H = 576;
const GAP    = 7;
const RADIUS = "6pt";
const FONT   = "'Roboto Condensed', 'Arial Narrow', sans-serif";

/* Font sizes */
const TITLE_SZ = "8.5pt";

const CERT_FR = "Nous certifions par la présente que la commande référencée ci-dessus est acceptable et répond à toutes exigences comme spécifié sur votre commande.";
const CERT_EN = "We hereby certify that the referenced order above is acceptable and meets all requirements as specified on your order.";

export function PackLabel({ data, lang }: PackLabelProps) {
  const now = new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const printDate = `${MONTHS[now.getMonth()]}-${String(now.getDate()).padStart(2,"0")}-${now.getFullYear()}`;
  const printTime = now.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

  const certText = lang === "fr" ? CERT_FR : CERT_EN;
  const workOrder = `${data.TRNO}-${String(data.TRITEM).padStart(3, "0")}`;
  const desc = lang === "fr" ? data.INVENTAIRE_INDESC1 : data.INVENTAIRE_INDESC2;

  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        padding: `${GAP}px`,
        fontFamily: FONT,
        backgroundColor: "#fff",
        color: "#000",
        lineHeight: 1.3,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header: logo left / skid + barcode right ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
        <img src="/logo-seatply.png" alt="SeatPly" style={{ height: "58px", alignSelf: "center" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: TITLE_SZ }}>Contenant # / Skid #:</div>
          <div style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1 }}>{data.CON_NUMERO}</div>
          {/* Code 39 barcode — Libre Barcode 39 renders * as start/stop chars */}
          <div style={{ fontFamily: "'Libre Barcode 39'", fontSize: "38pt", lineHeight: 0.9, overflow: "hidden", maxWidth: "220px" }}>
            *{data.CON_NUMERO}*
          </div>
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "13pt", marginBottom: "4px" }}>
        FINISHED PRODUCT / PRODUIT FINIS
      </div>

      {/* ── Main bordered section ── */}
      <div
        style={{
          border: "1.5px solid #000",
          borderRadius: RADIUS,
          padding: "5px 8px",
          marginBottom: "4px",
        }}
      >
        {/* Client / Customer */}
        <div>
          <div style={{ fontSize: TITLE_SZ }}>Client / Customer:</div>
          <div style={{
            fontSize: "17pt", fontWeight: 700, lineHeight: 1.1,
            height: "37.3pt", overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{data.CLIENT_CLNOM}</div>
        </div>

        {/* Customer PO */}
        <div style={{ marginTop: "5px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Client / Customer PO #:</div>
          <div style={{
            fontSize: "23pt", fontWeight: 700, lineHeight: 1.1,
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}>
            {data.CONOPO ?? ""}
          </div>
        </div>

        {/* Product / Item */}
        <div style={{ marginTop: "5px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Produit / Item #:</div>
          <div style={{ fontSize: "17pt", fontWeight: 700, lineHeight: 1.1 }}>{data.INNOINV}</div>
          <div style={{
            fontSize: "14pt", lineHeight: 1.1,
            height: "30.8pt", overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{desc}</div>
        </div>

        {/* Work Order */}
        <div style={{ marginTop: "5px" }}>
          <div style={{ fontSize: TITLE_SZ }}>Bon de Commande / Our Job #:</div>
          <div style={{ fontSize: "20pt", fontWeight: 700, lineHeight: 1.1 }}>{workOrder}</div>
        </div>
      </div>

      {/* ── Date / Qty row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto 1fr",
        columnGap: "4px",
        rowGap: "2px",
        marginBottom: "6px",
      }}>
        <div style={{ fontSize: TITLE_SZ, textAlign: "center", alignSelf: "end" }}>Date</div>
        <div style={{ fontSize: TITLE_SZ, textAlign: "center", alignSelf: "end" }}>Qté Contenant / Qty in Skid</div>
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, textAlign: "center", padding: "3px 4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "14pt", fontWeight: 700, lineHeight: 1.1 }}>{printDate}</div>
          <div style={{ fontSize: "9pt", color: "#666" }}>{printTime}</div>
        </div>
        <div style={{ border: "1.5px solid #000", borderRadius: RADIUS, textAlign: "center", padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: "23pt", fontWeight: 700, lineHeight: 1 }}>
            {data.DCO_QTE_INV}
            <span style={{ fontSize: "10pt", fontWeight: 400 }}> pcs</span>
          </div>
        </div>
      </div>

      {/* ── Certification note (fills remaining space) ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 4px" }}>
        <div style={{ fontSize: "10pt", textAlign: "center", lineHeight: 1.1 }}>{certText}</div>
      </div>

      {/* ── Bottom rule + quality controller ── */}
      <div>
        <div style={{ borderTop: "1.5px solid #000", marginBottom: "2px" }} />
        <div style={{ fontSize: "11pt", textAlign: "center" }}>
          {lang === "fr" ? "Contrôleur qualité" : "Quality Controller"}
        </div>
      </div>
    </div>
  );
}
