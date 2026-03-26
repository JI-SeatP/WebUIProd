const express = require("express");
const cors = require("cors");
const { sql, getPool, getPoolExt, DB_EXT } = require("./db.cjs");
const { XMLParser } = require("fast-xml-parser");

const app = express();

// ─── AutoFab SOAP API helper ─────────────────────────────────────────────────
// Replicates CF support.cfc → envoiXMLGet: calls the AutoFab SOAP web service
// for EXECUTE_TRANSACTION and EXECUTE_STORED_PROC commands.
let _autofabConfig = null;
async function getAutofabConfig() {
  if (_autofabConfig) return _autofabConfig;
  const pool = await getPool();
  const r = await pool.request().query(
    `SELECT TOP 1 PAWS_PORT, PAWS_IP FROM vPARAMETRE ORDER BY PASEQ`
  );
  if (!r.recordset.length) throw new Error("No vPARAMETRE row found");
  const { PAWS_PORT, PAWS_IP } = r.recordset[0];
  // Old software URL (support.cfc:3495): {AutoFabServeur}:{AutoFabPort}/{command}
  // AutoFabServeur = "http://IP", AutoFabPort = "PORT"
  // Result: http://IP:PORT/EXECUTE_TRANSACTION
  _autofabConfig = {
    baseUrl: `http://${PAWS_IP}`,
    port: PAWS_PORT,
  };
  console.log(`[autofab] Configured: ${_autofabConfig.baseUrl}:${_autofabConfig.port}/{command}`);
  return _autofabConfig;
}

/**
 * Call the AutoFab SOAP API — exact replica of CF support.cfc envoiXMLGet.
 * @param {string} command - "EXECUTE_TRANSACTION" or "EXECUTE_STORED_PROC"
 * @param {string} params  - Parameters string (comma-separated for SP, semicolon-separated for TRANSACTION)
 * @param {string} traitement - Treatment type (e.g. "EPF", "EPFDETAIL", "SM", or SP name like "Nba_Sp_Insert_Production")
 * @param {string} operation  - Operation code (e.g. "INS", "0")
 * @returns {{ retval: string|number, OutputValues: Record<string, string> }}
 */
async function callAutofab(command, params, traitement, operation) {
  const cfg = await getAutofabConfig();
  let soapBody;

  if (command === "EXECUTE_TRANSACTION") {
    soapBody = `<${command} xmlns="AutofabAPI">
      <STRAITEMENT>${traitement}</STRAITEMENT>
      <SOPERATION>${operation}</SOPERATION>
      <SLESVARIABLES>${params}</SLESVARIABLES>
    </${command}>`;
  } else if (command === "EXECUTE_STORED_PROC") {
    soapBody = `<${command} xmlns="AutofabAPI">
      <sQuery>${traitement} ${params}</sQuery>
      <nExt>${operation}</nExt>
    </${command}>`;
  } else {
    throw new Error(`Unknown AutoFab command: ${command}`);
  }

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>${soapBody}</soap:Body>
    </soap:Envelope>`;

  const url = `${cfg.baseUrl}:${cfg.port}/${command}`;
  console.log(`[autofab] POST ${url} traitement=${traitement} operation=${operation}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Accept-Encoding": "deflate;q=0",
      SOAPAction: `${cfg.baseUrl}:${cfg.port}/${command}`,
    },
    body: soapEnvelope.trim(),
    signal: AbortSignal.timeout(300000),
  });

  const xmlText = await response.text();
  console.log(`[autofab] Response status=${response.status} len=${xmlText.length} body=${xmlText.substring(0, 500)}`);

  // Parse XML response — the AutoFab API returns plain XML (not SOAP-wrapped):
  // <EXECUTE_TRANSACTION_response xmlns="AutofabAPI"><retval>56672</retval></EXECUTE_TRANSACTION_response>
  // or for SPs: <EXECUTE_STORED_PROC_response><OutputValues><TJSEQ>123</TJSEQ></OutputValues></EXECUTE_STORED_PROC_response>
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const parsed = parser.parse(xmlText);

  const result = { retval: null, OutputValues: {} };

  // Recursively extract retval and OutputValues from anywhere in the parsed object
  function extractValues(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const [key, val] of Object.entries(obj)) {
      const lk = key.toLowerCase();
      if (lk === "retval") {
        result.retval = val;
      } else if (lk === "outputvalues") {
        if (typeof val === "object") {
          for (const [k2, v2] of Object.entries(val)) {
            if (typeof v2 !== "object") result.OutputValues[k2] = v2;
          }
        }
      } else if (typeof val === "object") {
        extractValues(val);
      }
    }
  }
  extractValues(parsed);

  console.log(`[autofab] Result: retval=${result.retval} outputs=${JSON.stringify(result.OutputValues)}`);
  return result;
}
app.use(cors());
app.use(express.json());

// ─── Document path conversion (mirrors CF's CheminFichier → RacineDocuments) ──
// Test env: c:\sites\test\EcransSeatply\documents\ → http://10.4.80.6:800/AUTOFAB_SEATPLY_TEST/documents/
const CF_DOC_SERVER_PATH = "c:\\sites\\test\\ecransseatply\\documents\\"; // lowercased for comparison
const CF_DOC_BASE_URL    = "http://10.4.80.6:800/AUTOFAB_SEATPLY_TEST/documents/";

function convertDocPath(raw) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw; // already a URL
  // Normalize to backslashes and lowercase for case-insensitive match (like CF's ReplaceNoCase)
  const normalized = raw.replace(/\//g, "\\").toLowerCase();
  if (normalized.startsWith(CF_DOC_SERVER_PATH)) {
    return CF_DOC_BASE_URL + raw.slice(CF_DOC_SERVER_PATH.length).replace(/\\/g, "/");
  }
  return raw; // unknown format, pass through
}

// Helper: wrap handler with try/catch and standard response envelope
function handler(fn) {
  return async (req, res) => {
    const start = Date.now();
    try {
      await fn(req, res);
    } catch (err) {
      console.error(`[ERROR] ${req.path}:`, err.message);
      res.json({ success: false, data: null, error: err.message });
    } finally {
      console.log(`[${req.method}] ${req.path} — ${Date.now() - start}ms`);
    }
  };
}

// ─── POST /validateEmployee.cfm ──────────────────────────────────────────────
app.post(
  "/validateEmployee.cfm",
  handler(async (req, res) => {
    const { employeeCode } = req.body;
    const code = String(employeeCode).substring(0, 5);

    const pool = await getPool();
    const result = await pool
      .request()
      .input("code", sql.VarChar(5), code).query(`
        SELECT em.EMSEQ, em.EMNO, em.EMNOM, em.EMACTIF, em.EMNOIDENT, em.MACHINE, em.EMEMAIL, em.EQUIPE,
          e.EQDESC_P AS NOMEQUIPE_P, e.EQDESC_S AS NOMEQUIPE_S, e.EQDEBUTQUART, e.EQFINQUART,
          m.DEPARTEMENT, m.ENTREPOT, m.POSTE,
          f.EFCTDESC_P AS Fonction_P, f.EFCTDESC_S AS Fonction_S, f.EFCTCODE AS CodeFonction
        FROM EMPLOYE em
        LEFT JOIN EQUIPE e ON em.EQUIPE = e.EQSEQ
        LEFT JOIN MACHINE m ON em.MACHINE = m.MASEQ
        LEFT JOIN EMP_FCT f ON em.EMP_FCT = f.EFCTSEQ
        WHERE em.EMNOIDENT = @code
      `);

    if (result.recordset.length === 1) {
      const row = result.recordset[0];
      if (row.EMACTIF) {
        res.json({ success: true, data: row, message: "Employee found" });
      } else {
        res.json({
          success: false,
          data: "",
          error: "Employee is inactive",
        });
      }
    } else {
      res.json({ success: false, data: "", error: "Employee not found" });
    }
  })
);

// ─── GET /getWorkOrders.cfm ──────────────────────────────────────────────────
app.get(
  "/getWorkOrders.cfm",
  handler(async (req, res) => {
    const { departement = "", machine = "", search = "", status = "" } =
      req.query;
    const pool = await getPoolExt();
    const request = pool.request();

    let where = `
      WHERE v.OPERATION <> 'FINSH'
      AND (dc.DCPRIORITE < 100000 OR v.DATE_DEBUT_PREVU IS NOT NULL)
      AND v.MACODE <> 'PRESS_NS'
    `;

    if (parseInt(departement)) {
      request.input("dept", sql.Int, parseInt(departement));
      where += ` AND v.DESEQ = @dept`;
    }

    if (parseInt(machine)) {
      request.input("machine", sql.Int, parseInt(machine));
      where += ` AND v.MACHINE = @machine`;
    }

    if (status) {
      const codes = status.split(",").map((s) => s.trim());
      const statusConditions = codes
        .map((_, i) => `@status${i}`)
        .join(",");
      codes.forEach((code, i) => {
        request.input(`status${i}`, sql.VarChar(20), code);
      });
      where += ` AND v.STATUT_CODE IN (${statusConditions})`;
    }

    if (search) {
      const s = search.substring(0, 50);
      const s20 = search.substring(0, 20);
      const s150 = search.substring(0, 150);
      request.input("search50", sql.VarChar(52), `%${s}%`);
      request.input("search20", sql.VarChar(22), `%${s20}%`);
      request.input("search150", sql.VarChar(152), `%${s150}%`);
      where += `
        AND (
          v.NO_PROD LIKE @search50
          OR v.NOM_CLIENT LIKE @search50
          OR v.CODE_CLIENT LIKE @search20
          OR v.PRODUIT_P LIKE @search150
          OR v.PRODUIT_S LIKE @search150
          OR v.PRODUIT_CODE LIKE @search20
          OR v.INVENTAIRE_P LIKE @search150
          OR v.INVENTAIRE_S LIKE @search150
          OR v.NO_INVENTAIRE LIKE @search20
          OR v.MATERIEL_P LIKE @search150
          OR v.MATERIEL_S LIKE @search150
          OR v.MATERIEL_CODE LIKE @search20
          OR v.GROUPE LIKE @search50
          OR v.MOULE_CODE LIKE @search50
          OR v.PANNEAU LIKE @search50
          OR v.MACHINE_P LIKE @search50
          OR v.MACHINE_S LIKE @search50
          OR v.MACODE LIKE @search20
        )
      `;
    }

    const result = await request.query(`
      SELECT DISTINCT
        v.TRANSAC, v.COPMACHINE, v.NOPSEQ, v.TJSEQ,
        v.NO_PROD, v.NOM_CLIENT, v.CODE_CLIENT,
        VBE.CONOPO,
        v.TREPOSTER_TRANSFERT,
        v.OPERATION, v.OPERATION_P, v.OPERATION_S, v.OPERATION_SEQ,
        v.MACHINE, v.MACODE, v.MACHINE_P, v.MACHINE_S,
        v.DEPARTEMENT, v.DESEQ, v.DECODE, v.DeDescription_P, v.DeDescription_S,
        v.FAMILLEMACHINE, v.FMCODE,
        v.NO_INVENTAIRE, v.INVENTAIRE_SEQ, v.INVENTAIRE_P, v.INVENTAIRE_S,
        v.PRODUIT_CODE, v.PRODUIT_SEQ, v.PRODUIT_P, v.PRODUIT_S,
        v.MATERIEL_CODE, v.MATERIEL_SEQ, v.MATERIEL_P, v.MATERIEL_S,
        v.Panneau, v.MOULE_CODE, v.GROUPE, v.REVISION,
        v.DATE_DEBUT_PREVU, v.DATE_FIN_PREVU, v.TJFINDATE,
        v.PR_DEBUTE, v.PR_TERMINE, v.TERMINE,
        v.QTE_A_FAB, v.QTE_PRODUITE, v.QTE_RESTANTE, v.QTE_FORCEE, v.QTY_REQ,
        v.STATUT_CODE, v.STATUT_P, v.STATUT_S,
        dc.DCPRIORITE,
        v.ESTKIT, v.ENTREPOT, v.ENTREPOT_CODE, v.ENTREPOT_P, v.ENTREPOT_S,
        VBE.DCQTE_A_FAB AS VBE_DCQTE_A_FAB,
        VBE.DCQTE_A_PRESSER, VBE.DCQTE_PRESSED,
        VBE.DCQTE_PENDING_TO_PRESS, VBE.DCQTE_PENDING_TO_MACHINE,
        VBE.DCQTE_FINISHED, VBE.DCQTE_REJET,
        VBE.PCS_PER_PANEL, VBE.SHARE_PRESSING, VBE.PAGE_COMPO, VBE.Panel_NiSeq,
        v.VCUT_INNOINV, v.VCUT_INDESC1, v.VCUT_INDESC2
      FROM vEcransProduction v
      INNER JOIN AUTOFAB_DET_COMM dc ON v.TRANSAC = dc.TRANSAC
      LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = v.TRANSAC
      ${where}
      ORDER BY dc.DCPRIORITE, v.NO_PROD, v.DATE_DEBUT_PREVU
    `);

    let rows = result.recordset;

    // V-CUT enrichment: compute big sheet qty used per TRANSAC
    const vcutTransacs = [...new Set(
      rows
        .filter((r) => r.NO_INVENTAIRE === "VCUT" || r.PRODUIT_CODE === "VCUT")
        .map((r) => r.TRANSAC)
    )];

    if (vcutTransacs.length > 0) {
      const poolPrimary = await getPool();

      for (const tr of vcutTransacs) {
        // Big sheet qty used
        const bsResult = await poolPrimary.request()
          .input("tr", sql.Int, tr)
          .query(`
            SELECT SUM(det.DTRQTE) AS TotalBigSheet
            FROM DET_TRANS det
            INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
            WHERE t.TRANSAC = @tr AND t.TRNO_EQUATE = 7
          `);
        const totalBigSheet = bsResult.recordset[0]?.TotalBigSheet || 0;

        // Big sheet inventory info
        const bsInfo = await poolPrimary.request()
          .input("tr", sql.Int, tr)
          .query(`
            SELECT TOP 1 INVENTAIRE_INNOINV, INVENTAIRE_INDESC1, INVENTAIRE_INDESC2
            FROM cNOMENCOP
            WHERE TRANSAC = @tr
            AND INVENTAIRE_P NOT IN (SELECT INSEQ FROM INVENTAIRE WHERE INNOINV='VCUT')
          `);
        const info = bsInfo.recordset[0];

        // Inject into matching rows
        for (const row of rows) {
          if (row.TRANSAC === tr) {
            row.VCUT_QTE_UTILISEE = totalBigSheet;
            if (info) {
              row.BIGSHEET_INNOINV = info.INVENTAIRE_INNOINV;
              row.BIGSHEET_INDESC1 = info.INVENTAIRE_INDESC1;
              row.BIGSHEET_INDESC2 = info.INVENTAIRE_INDESC2;
            }
          }
        }
      }
    }

    // Row grouping: replicate old ColdFusion <cfloop GROUP="..."> behavior
    // Dept 9 & 11: group by NO_PROD; others: group by NOPSEQ
    const seenKeys = new Set();
    rows = rows.filter((r) => {
      const groupKey = (r.DESEQ === 9 || r.DESEQ === 11)
        ? r.NO_PROD
        : String(r.NOPSEQ);
      if (seenKeys.has(groupKey)) return false;
      seenKeys.add(groupKey);
      return true;
    });

    res.json({
      success: true,
      data: rows,
      message: `Retrieved ${rows.length} work orders`,
    });
  })
);

// ─── GET /getVcutData.cfm ────────────────────────────────────────────────────
// Returns VCUT-specific data: components, containers, quantities, big sheet info.
// Replicates old trouveUnTableauVCut + trouveContenantsVCut + VCUT info queries.
app.get(
  "/getVcutData.cfm",
  handler(async (req, res) => {
    const transac = parseInt(req.query.transac) || 0;
    if (!transac) {
      return res.json({ success: false, error: "transac parameter is required" });
    }

    const pool = await getPool();
    const poolExt = await getPoolExt();

    // VCUT Info (QTE_FORCEE, VCUT descriptions)
    const vcutInfoResult = await poolExt.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT TOP 1 v.QTE_FORCEE, v.VCUT_INNOINV, v.VCUT_INDESC1, v.VCUT_INDESC2
        FROM vEcransProduction v
        WHERE v.OPERATION <> 'FINSH'
        AND v.TRANSAC = @tr AND v.NO_INVENTAIRE = 'VCUT'
        ORDER BY v.OrdreRecette
      `);
    const vcutInfo = vcutInfoResult.recordset[0];

    // BigSheet total used
    const bsTotalResult = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT SUM(det.DTRQTE) AS TotalBigSheet
        FROM DET_TRANS det
        INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
        WHERE t.TRANSAC = @tr AND t.TRNO_EQUATE = 7
      `);

    // BigSheet inventory info
    const bsInfoResult = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT TOP 1 INVENTAIRE_INNOINV, INVENTAIRE_INDESC1, INVENTAIRE_INDESC2
        FROM cNOMENCOP
        WHERE TRANSAC = @tr
        AND INVENTAIRE_P NOT IN (SELECT INSEQ FROM INVENTAIRE WHERE INNOINV='VCUT')
      `);
    const bsInfo = bsInfoResult.recordset[0];

    // VCUT Components (replicates trouveUnTableauVCut)
    const compResult = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT CNOMENCLATURE.NISEQ, CNOMENCLATURE.NIQTE, CNOMENCLATURE.INVENTAIRE_M,
          CNOMENCLATURE.INVENTAIRE_M_INNOINV, INVENTAIRE.INDESC1, INVENTAIRE.INDESC2,
          CNOMENCLATURE.NIVALEUR_CHAR1, CEILING(VENEER.QTY_REQ) AS QTY_REQ,
          CNOMENCLATURE.NILONGUEUR, CNOMENCLATURE.NILARGEUR
        FROM CNOMENCLATURE
        LEFT OUTER JOIN INVENTAIRE ON (INVENTAIRE.INSEQ = cNOMENCLATURE.INVENTAIRE_M)
        OUTER APPLY (
          SELECT (CN_FILS.NIQTE * CNOMENCLATURE.NIQTE) QTY_REQ
          FROM cNOMENCLATURE CN_FILS
          WHERE CN_FILS.NISEQ_PERE = CNOMENCLATURE.NISEQ
        ) VENEER
        WHERE CNOMENCLATURE.TRANSAC = @tr
        AND CNOMENCLATURE.NISEQ_PERE IS NULL
      `);

    // Per-component quantities
    const components = [];
    for (const comp of compResult.recordset) {
      // Good & defect from TEMPSPROD
      const qteResult = await pool.request()
        .input("tr", sql.Int, transac)
        .input("invM", sql.Int, comp.INVENTAIRE_M)
        .input("niseq", sql.Int, comp.NISEQ)
        .query(`
          SELECT SUM(TJQTEPROD) AS TOTALPROD, SUM(TJQTEDEFECT) AS TOTALDEFECT
          FROM TEMPSPROD
          WHERE TRANSAC = @tr
          AND (INVENTAIRE_C = @invM OR cNOMENCLATURE = @niseq)
        `);

      // Big sheets used per component
      const bsCompResult = await pool.request()
        .input("tr", sql.Int, transac)
        .input("niseq", sql.Int, comp.NISEQ)
        .query(`
          SELECT SUM(det.DTRQTE) AS TotalBigSheet
          FROM DET_TRANS det
          INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
          WHERE t.TRANSAC = @tr AND t.TRNO_EQUATE = 7
          AND det.TRANSAC_TRNO IN (
            SELECT SMNOTRANS FROM TEMPSPROD WHERE cNOMENCLATURE = @niseq
          )
        `);

      const qte = qteResult.recordset[0];
      const bsComp = bsCompResult.recordset[0];
      components.push({
        ...comp,
        totalProd: qte?.TOTALPROD || 0,
        totalDefect: qte?.TOTALDEFECT || 0,
        totalBigSheet: bsComp?.TotalBigSheet || 0,
      });
    }

    // Veneer Containers (view in EXT db, ENTREPOT table in primary db)
    const contResult = await poolExt.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT v.CONTENANT_CON_NUMERO, v.DTRQTE,
          v.ENTREPOT_ENCODE,
          e.ENDESC_P, e.ENDESC_S,
          v.SPECIE, v.GRADE, v.THICKNESS, v.CUT,
          v.LONGUEUR, v.LARGEUR
        FROM VSP_BonTravail_VeneerReserve v
        LEFT OUTER JOIN TS_SEATPL.dbo.ENTREPOT e ON v.ENTREPOT = e.ENSEQ
        WHERE v.TRANSAC = @tr
      `);

    res.json({
      success: true,
      data: {
        components,
        containers: contResult.recordset,
        qteForcee: vcutInfo?.QTE_FORCEE || 0,
        qteUtilisee: bsTotalResult.recordset[0]?.TotalBigSheet || 0,
        bigsheetDesc_P: bsInfo?.INVENTAIRE_INDESC1 || "",
        bigsheetDesc_S: bsInfo?.INVENTAIRE_INDESC2 || "",
        bigsheetCode: bsInfo?.INVENTAIRE_INNOINV || "",
        vcutDesc_P: vcutInfo?.VCUT_INDESC1 || "",
        vcutDesc_S: vcutInfo?.VCUT_INDESC2 || "",
      },
    });
  })
);

// ─── GET /getOperation.cfm ───────────────────────────────────────────────────
// Replicates the exact 2-step approach from the CFM getOperation.cfm:
//   Step 1: Get TJSEQ from vEcransProduction (latest TEMPSPROD row for this operation)
//   Step 2: Run RequeteAlternative query on PRIMARY DB with INNER JOIN TEMPSPROD
// This gives STATUT_CODE directly from TPROD.MODEPROD_MPCODE — no override needed.
// Cross-DB refs to EXT use DB_EXT (mirrors CF's #datasourceExt# pattern).
app.get(
  "/getOperation.cfm",
  handler(async (req, res) => {
    const transac = parseInt(req.query.transac) || 0;
    const copmachine = parseInt(req.query.copmachine) || 0;

    if (!transac) {
      return res.json({
        success: false,
        error: "transac parameter is required",
      });
    }

    // ── Step 1: Get TJSEQ from vEcransProduction (same as CFM getOperation.cfm:37-46) ──
    // The view lives on EXT database, so we use poolExt for this lookup only.
    // CFM accesses it from datasourcePrimary via cross-DB resolution; Express uses poolExt directly.
    const poolExt = await getPoolExt();
    const lookupReq = poolExt.request().input("transac", sql.Int, transac);
    let lookupWhere = `WHERE v.TRANSAC = @transac AND v.OPERATION <> 'FINSH'`;
    if (copmachine) {
      lookupReq.input("copmachine", sql.Int, copmachine);
      lookupWhere += ` AND v.COPMACHINE = @copmachine`;
    }
    const lookupResult = await lookupReq.query(`
      SELECT TOP 1 v.TJSEQ
      FROM vEcransProduction v
      ${lookupWhere}
      ORDER BY v.TJSEQ DESC
    `);

    if (!lookupResult.recordset.length || !lookupResult.recordset[0].TJSEQ) {
      return res.json({
        success: false,
        error: `Operation not found for transac=${transac} copmachine=${copmachine}`,
      });
    }

    const theTJSEQ = lookupResult.recordset[0].TJSEQ;

    // ── Step 2: RequeteAlternative on PRIMARY DB (same as CFM getOperation.cfm:59-147) ──
    // INNER JOIN TEMPSPROD on exact TJSEQ gives STATUT_CODE directly — no override needed.
    // Cross-DB refs to EXT for VBE and functions use DB_EXT.
    const pool = await getPool();
    const result = await pool.request()
      .input("theTJSEQ", sql.Int, theTJSEQ)
      .query(`
      SELECT DISTINCT
        PL.PR_ORDO_DEBUT AS DATE_DEBUT_PREVU,
        PL.PR_ORDO_FIN AS DATE_FIN_PREVU,
        PL.PR_DEBUTE,
        PL.PR_TERMINE,
        DBO.FctFormatNoProd(CO.CONOTRANS, T.TRITEM) AS NO_PROD,
        CO.CLIENT_CLNOM AS NOM_CLIENT,
        CO.CLIENT_CLCODE AS CODE_CLIENT,
        CO.CONOPO,
        PL.INVENTAIRE AS INVENTAIRE_SEQ,
        PL.INVENTAIRE_INNOINV AS NO_INVENTAIRE,
        PL.INVENTAIRE_INDESC1 AS INVENTAIRE_P,
        PL.INVENTAIRE_INDESC2 AS INVENTAIRE_S,
        T.INVENTAIRE_INREV AS REVISION,
        CN_FAB.INVENTAIRE_M AS MATERIEL_SEQ,
        CN_FAB.INVENTAIRE_M_INNOINV AS MATERIEL_CODE,
        CN_FAB.INVENTAIRE_M_INDESC1 AS MATERIEL_P,
        CN_FAB.INVENTAIRE_M_INDESC2 AS MATERIEL_S,
        CN_FAB.INVENTAIRE_P AS PRODUIT_SEQ,
        CN_FAB.INVENTAIRE_P_INNOINV AS PRODUIT_CODE,
        CN_FAB.INVENTAIRE_P_INDESC1 AS PRODUIT_P,
        CN_FAB.INVENTAIRE_P_INDESC2 AS PRODUIT_S,
        T.INVENTAIRE AS KIT_SEQ,
        CNOP.INVENTAIRE AS INVENTAIRE_VCUT,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INNOINV ELSE CNOP.INVENTAIRE_INNOINV END AS VCUT_INNOINV,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INDESC1 ELSE CNOP.INVENTAIRE_INDESC1 END AS VCUT_INDESC1,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INDESC2 ELSE CNOP.INVENTAIRE_INDESC2 END AS VCUT_INDESC2,
        CNOP.OPERATION AS OPERATION_SEQ,
        CNOP.OPERATION_OPCODE AS OPERATION,
        CNOP.OPERATION_OPDESC_P AS OPERATION_P,
        CNOP.OPERATION_OPDESC_S AS OPERATION_S,
        CNOP.NOPOrdreRecette AS ORDRERECETTE,
        OP.OPCOUTHEURE AS TAUXHORAIREOPERATION,
        CNOP.CNOMENCLATURE AS CNOMENCLATURE,
        CNOM.CNOM_QTE,
        INVENTAIRE_FAB.IN_QTE_PAR_EMBAL AS QTE_PAR_EMBAL,
        INVENTAIRE_FAB.IN_QTE_PAR_CONT AS QTE_PAR_CONT,
        CN_FAB.NIQTE,
        PR_QUANTITE_A_FAB AS QTE_A_FAB,
        (SELECT SUM(TEMPSPROD.TJQTEPROD) FROM TEMPSPROD AS TEMPSPROD WHERE TEMPSPROD.TRANSAC = CNOP.TRANSAC AND TEMPSPROD.CNOMENCOP = CNOP.NOPSEQ) AS QTE_PRODUITE,
        ISNULL(CNOM.CNOM_QTE, CASE WHEN CN_FAB.NISEQ IS NOT NULL THEN DBO.FctQteASortir(CN_FAB.NISEQ) * DC.DCQTE_A_FAB ELSE DC.DCQTE_A_FAB END) - ISNULL((SELECT SUM(TP.TJQTEPROD) FROM TEMPSPROD TP WHERE TP.CNOMENCOP = CNOP.NOPSEQ AND ISNULL(TP.cNomencOp_Machine,0) = ISNULL(CNOM.CNOM_SEQ,0)),0) AS QTE_RESTANTE,
        CASE WHEN ISNULL(${DB_EXT}.DBO.AUTOFAB_FctSelectVar(T.TRSEQ, CNOP.NOPSEQ, '@QTE_FORCE@'),0) = 0 THEN ${DB_EXT}.DBO.AUTOFAB_FctSelectVar(T.TRSEQ, NULL, '@TOTAL_BIGSHEET@') ELSE ${DB_EXT}.DBO.AUTOFAB_FctSelectVar(T.TRSEQ, CNOP.NOPSEQ, '@QTE_FORCE@') END AS QTE_FORCEE,
        CASE WHEN CN_FAB.NILONGUEUR = 0 OR CN_FAB.NILARGEUR = 0 OR FLOOR((SRC.INLONGUEUR_MSE / CN_FAB.NILONGUEUR) * (SRC.INLARGEUR_MSE / CN_FAB.NILARGEUR)) = 0
          THEN 0
          ELSE CEILING(CN_FAB.NIQTE / FLOOR((SRC.INLONGUEUR_MSE / CN_FAB.NILONGUEUR) * (SRC.INLARGEUR_MSE / CN_FAB.NILARGEUR)))
        END AS QTY_REQ,
        MA.MASEQ AS MACHINE,
        MA.MACODE,
        MA.MADESC_P AS MACHINE_P,
        MA.MADESC_S AS MACHINE_S,
        T.UNITE_INV_UNDESC1 AS UNITE_P,
        T.UNITE_INV_UNDESC2 AS UNITE_S,
        T.TRSEQ AS TRANSAC,
        CNOP.NOPSEQ,
        CNOM.CNOM_SEQ AS COPMACHINE,
        ${DB_EXT}.DBO.FctGet_PANNEAUX(CNOP.TRANSAC, CNOP.CNOMENCLATURE) AS Panneau,
        PC.PPINNOINV,
        f.FMCODE,
        MA.FAMILLEMACHINE,
        DEP.DESEQ,
        DEP.DECODE,
        DEP.DEDESCRIPTION_P AS DeDescription_P,
        DEP.DEDESCRIPTION_S AS DeDescription_S,
        DC.DCPRIORITE,
        T.INVENTAIRE_INKIT AS ESTKIT,
        T.TYPEPRODUIT,
        MA.DEPARTEMENT,
        TRANSFERT.TREPOSTER AS TREPOSTER_TRANSFERT,
        T.TRNOTE,
        -- Status from TEMPSPROD INNER JOIN (same as CFM RequeteAlternative line 106)
        TPROD.MODEPROD_MPCODE AS STATUT_CODE,
        TPROD.MODEPROD_MPDESC_P AS STATUT_P,
        TPROD.MODEPROD_MPDESC_S AS STATUT_S,
        TPROD.TJFINDATE AS TJFINDATE,
        TPROD.TJPROD_TERMINE AS TERMINE,
        TPROD.TJSEQ,
        -- VBE fields (cross-DB ref to EXT, same as CFM line 131)
        VBE.DCQTE_A_FAB AS VBE_DCQTE_A_FAB, VBE.DCQTE_A_PRESSER, VBE.DCQTE_PRESSED,
        VBE.DCQTE_PENDING_TO_PRESS, VBE.DCQTE_PENDING_TO_MACHINE,
        VBE.DCQTE_FINISHED, VBE.DCQTE_REJET,
        VBE.PCS_PER_PANEL, VBE.CONOPO AS VBE_CONOPO, VBE.SHARE_PRESSING, VBE.PAGE_COMPO, VBE.Panel_NiSeq,
        VBE.Mold AS MOULE_CODE,
        VBE.NUM_PER_PACK AS PANNEAU_CAVITE,
        VBE.OPENING AS MOULE_CAVITE,
        VBE.[ACTUAL GAP] AS MOULE_ECART,
        VBE.PV_Groupe AS GROUPE,
        VBE.PRODUCT_TYPE AS VBE_TYPEPRODUIT,
        RTRIM(VBE.PANEL_SOURCE) AS PANEL_SOURCE,
        RTRIM(VBE.PV_PANEAU) AS PV_PANEAU,
        -- Function calls (cross-DB ref to EXT)
        ${DB_EXT}.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@MOLD_TYPE@') AS MOULE_TYPE,
        ${DB_EXT}.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@TIME_PR_PRESSING@') AS PRESSAGE_PRESSAGE,
        ${DB_EXT}.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@TIME_PR_TEST_PR@') AS PRESSAGE_TEST_APRES,
        ${DB_EXT}.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@PRESS_NOTE@') AS PRESSAGE_NOTE,
        -- Scrap qty (primary DB)
        (SELECT SUM(TP.TJQTEDEFECT) FROM TEMPSPROD TP WHERE TP.TRANSAC = T.TRSEQ AND TP.CNOMENCOP = CNOP.NOPSEQ) AS NOPQTESCRAP
      FROM COMMANDE CO
      INNER JOIN TRANSAC T ON T.TRNO = CO.CONOTRANS
      INNER JOIN DET_COMM DC ON DC.TRANSAC = T.TRSEQ
      INNER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = T.TRSEQ
      LEFT OUTER JOIN ${DB_EXT}.dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = (SELECT TOP 1 TRANSAC FROM ${DB_EXT}.dbo.VSP_BonTravail_Entete VBE2 WHERE VBE2.TRANSAC = T.TRSEQ)
      LEFT OUTER JOIN PL_RESULTAT PL ON CNOP.NOPSEQ = PL.CNOMENCOP
      LEFT OUTER JOIN INVENTAIRE INVENTAIRE_FAB ON CNOP.INVENTAIRE_P = INVENTAIRE_FAB.INSEQ
      LEFT OUTER JOIN CNOMENCLATURE CN_FAB ON CN_FAB.NISEQ = CNOP.CNOMENCLATURE
      LEFT OUTER JOIN DET_CNOMENCOP D ON D.NOMENCOP = CNOP.NOPSEQ
      LEFT OUTER JOIN CNOMENCLATURE CN_MAT ON CN_MAT.NISEQ = D.NOMENCLATURE OR CN_MAT.NISEQ = CNOP.NOMENCLATURE
      LEFT OUTER JOIN CNOMENCOP_MACHINE CNOM ON CNOM.CNOMENCOP = CNOP.NOPSEQ AND CNOM.CNOM_SEQ = PL.CNOMENCOP_MACHINE
      INNER JOIN MACHINE MA ON MA.MASEQ = PL.MACHINE
      INNER JOIN DEPARTEMENT DEP ON DEP.DESEQ = MA.DEPARTEMENT
      INNER JOIN FAMILLEMACHINE f ON f.FMSEQ = MA.FAMILLEMACHINE
      LEFT OUTER JOIN OPERATION OP ON CNOP.OPERATION = OP.OPSEQ
      OUTER APPLY (SELECT TOP 1 PPINNOINV FROM PRIXCLIENT WHERE CNOP.INVENTAIRE_P = INVENTAIRE) AS PC
      LEFT OUTER JOIN cNOMENCLATURE AS MCX_KIT ON MCX_KIT.TRANSAC = CNOP.TRANSAC AND MCX_KIT.NIREGRP_PROD1 IN ('KIT','AP')
      OUTER APPLY (SELECT I.INLONGUEUR_MSE, I.INLARGEUR_MSE FROM INVENTAIRE I WHERE I.INSEQ = CNOP.INVENTAIRE) SRC
      OUTER APPLY (SELECT TOP 1 TE.TREPOSTER FROM TRANSFENTREP TE WHERE TE.CNOMENCOP = CNOP.NOPSEQ ORDER BY TE.TRESEQ DESC) AS TRANSFERT
      INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP
      WHERE TPROD.TJSEQ = @theTJSEQ
    `);

    if (!result.recordset.length) {
      return res.json({
        success: false,
        error: `Operation not found for TJSEQ=${theTJSEQ} (transac=${transac} copmachine=${copmachine})`,
      });
    }

    const row = result.recordset[0];

    // DEBUG: log panel warning fields
    console.log(`[getOperation] TRANSAC=${row.TRANSAC} STATUT_CODE=${row.STATUT_CODE} TJSEQ=${row.TJSEQ} PANEL_SOURCE=${JSON.stringify(row.PANEL_SOURCE)} PV_PANEAU=${JSON.stringify(row.PV_PANEAU)}`);

    // Fetch next step from VOperationParTransac (CNC/Sanding)
    if (row.ORDRERECETTE != null) {
      try {
        const nextStep = await pool.request()
          .input("transac2", sql.Int, row.TRANSAC)
          .input("ordreRecette", sql.Int, row.ORDRERECETTE)
          .query(`
            SELECT TOP 1 c.OPERATION_OPDESC_P, c.OPERATION_OPDESC_S,
                   c.MACHINE_MADESC_P, c.MACHINE_MADESC_S,
                   d.DEDESCRIPTION_P, d.DEDESCRIPTION_S
            FROM VOperationParTransac c
            INNER JOIN MACHINE M ON m.MASEQ = c.MACHINE
            INNER JOIN DEPARTEMENT d ON m.DEPARTEMENT = d.DESEQ
            WHERE c.TRANSAC = @transac2
              AND c.NOPORDRERECETTE > @ordreRecette
            ORDER BY c.NOPORDRERECETTE
          `);
        if (nextStep.recordset.length) {
          const ns = nextStep.recordset[0];
          row.NEXT_OPERATION = true;
          row.NEXT_OPERATION_P = ns.OPERATION_OPDESC_P;
          row.NEXT_OPERATION_S = ns.OPERATION_OPDESC_S;
          row.NEXT_MACHINE_P = ns.MACHINE_MADESC_P;
          row.NEXT_MACHINE_S = ns.MACHINE_MADESC_S;
          row.NEXT_DEPT_P = ns.DEDESCRIPTION_P;
          row.NEXT_DEPT_S = ns.DEDESCRIPTION_S;
        }
      } catch (nsErr) {
        console.warn("Next step query failed:", nsErr.message);
      }
    }

    // Fetch operation steps from INSTRUCTION/METHODE tables
    try {
      const cnomenclature = row.CNOMENCLATURE ? parseInt(row.CNOMENCLATURE) : 0;
      const stepsReq = pool.request().input("transacSteps", sql.Int, row.TRANSAC);
      let stepsSql;
      if (cnomenclature) {
        stepsReq.input("cnomenclature", sql.Int, cnomenclature);
        stepsSql = `
          SELECT MET.METSEQ, MET.METNUMERO, MET.METDESC_P, MET.METDESC_S,
                 MET.METFICHIER_PDF_P, MET.METFICHIER_PDF_S,
                 MET.METVIDEO_P, MET.METVIDEO_S,
                 MET.METRTF_P, MET.METRTF_S,
                 (SELECT COUNT(*) FROM DET_METHODE DM WHERE DM.METHODE = MET.METSEQ) AS IMAGE_COUNT
          FROM INSTRUCTION INST
          INNER JOIN METHODE MET ON MET.METSEQ = INST.METHODE
          WHERE INST.INSNOM_TABLE = 'CNOMENCLATURE'
            AND INST.INSSEQ_REFERENCE = @cnomenclature
          ORDER BY INST.INSORDRE
        `;
      } else {
        stepsSql = `
          SELECT MET.METSEQ, MET.METNUMERO, MET.METDESC_P, MET.METDESC_S,
                 MET.METFICHIER_PDF_P, MET.METFICHIER_PDF_S,
                 MET.METVIDEO_P, MET.METVIDEO_S,
                 MET.METRTF_P, MET.METRTF_S,
                 (SELECT COUNT(*) FROM DET_METHODE DM WHERE DM.METHODE = MET.METSEQ) AS IMAGE_COUNT
          FROM INSTRUCTION INST
          INNER JOIN METHODE MET ON MET.METSEQ = INST.METHODE
          WHERE INST.INSNOM_TABLE = 'TRANSAC'
            AND INST.INSSEQ_REFERENCE = @transacSteps
          ORDER BY INST.INSORDRE
        `;
      }
      const stepsResult = await stepsReq.query(stepsSql);
      // Convert server file paths → web URLs for PDF and video fields
      row.steps = stepsResult.recordset.map((s) => ({
        ...s,
        METFICHIER_PDF_P: convertDocPath(s.METFICHIER_PDF_P),
        METFICHIER_PDF_S: convertDocPath(s.METFICHIER_PDF_S),
        METVIDEO_P:       convertDocPath(s.METVIDEO_P),
        METVIDEO_S:       convertDocPath(s.METVIDEO_S),
      }));
    } catch (stepsErr) {
      console.warn("Steps query failed:", stepsErr.message);
      row.steps = [];
    }

    res.json({
      success: true,
      data: row,
      message: "Operation retrieved",
    });
  })
);

// ─── GET /getOrderOperations.cfm ─────────────────────────────────────────────
// Returns all operations that belong to the same order (NO_PROD).
// Used by the operation switcher in OperationHeader.
app.get(
  "/getOrderOperations.cfm",
  handler(async (req, res) => {
    const { noProd } = req.query;

    if (!noProd) {
      return res.json({ success: false, error: "Missing noProd parameter" });
    }

    const pool = await getPoolExt();
    const result = await pool
      .request()
      .input("noProd", sql.VarChar(50), noProd)
      .query(`
        SELECT DISTINCT
          v.TRANSAC, v.COPMACHINE, v.OPERATION_SEQ,
          v.OPERATION_P, v.OPERATION_S,
          v.MACHINE_P, v.MACHINE_S,
          v.FMCODE
        FROM vEcransProduction v
        INNER JOIN AUTOFAB_DET_COMM dc ON v.TRANSAC = dc.TRANSAC
        WHERE v.OPERATION <> 'FINSH'
          AND v.NO_PROD = @noProd
        ORDER BY v.OPERATION_SEQ
      `);

    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} operations`,
    });
  })
);

// ─── GET /getOperationComponents.cfm ──────────────────────────────────────────
app.get(
  "/getOperationComponents.cfm",
  handler(async (req, res) => {
    const { transac, copmachine } = req.query;
    const pool = await getPoolExt();

    if (!transac || !copmachine) {
      return res.json({
        success: false,
        error: "Missing transac or copmachine parameter",
      });
    }

    const result = await pool
      .request()
      .input("transac", sql.Int, parseInt(transac))
      .input("copmachine", sql.Int, parseInt(copmachine))
      .query(`
        SELECT
          cn.NISEQ, cn.NIQTE, cn.NILONGUEUR, cn.NILARGEUR, cn.NIEPAISSEUR,
          cn.INVENTAIRE_M_INNOINV, cn.INVENTAIRE_M_INDESC1, cn.INVENTAIRE_M_INDESC2,
          CI.CRCRITERE_1 AS SPECIES, CI.CRCRITERE_3 AS GRADE, CI.CRCRITERE_4 AS CUT,
          cn.NIVALEUR_CHAR1, cn.NIVALEUR_CHAR2, cn.NIVALEUR_CHAR3
        FROM vEcransProduction v
        INNER JOIN AUTOFAB_cNOMENCLATURE cn ON cn.TRANSAC = v.TRANSAC
        INNER JOIN AUTOFAB_CRITERE_INV CI ON CI.INVENTAIRE = cn.INVENTAIRE_M
        WHERE v.TRANSAC = @transac AND v.NOPSEQ = @copmachine
          AND cn.NIREGRP_PROD1 IN ('FACE', 'VENEER')
        ORDER BY cn.NISTR_NIVEAU, cn.NIRANG
      `);

    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} components`,
    });
  })
);

// ─── GET /getOperationAccessories.cfm ────────────────────────────────────────
// Returns the "ACCESSOIRES NÉCESSAIRES" list for a CNC operation.
// Uses AUTOFAB_FctSelectVarCompo() UDF (EXT database) to read accessory quantities
// stored as component variables, then looks up T-NUT descriptions in INVENTAIRE
// (primary database).
app.get(
  "/getOperationAccessories.cfm",
  handler(async (req, res) => {
    const { transac, copmachine } = req.query;

    if (!transac || !copmachine) {
      return res.json({
        success: false,
        error: "Missing transac or copmachine parameter",
      });
    }

    const poolExt = await getPoolExt();
    const poolPrimary = await getPool();

    // Step 1: Retrieve all accessory variable values via the UDF.
    // VCeduleMachine joins to AUTOFAB_cNOMENCOP to get the CNOMENCLATURE key
    // needed by AUTOFAB_FctSelectVarCompo.
    const varResult = await poolExt
      .request()
      .input("transac", sql.Int, parseInt(transac))
      .query(`
        SELECT TOP 1
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@SA1_ROUTER_BITS@') AS ROUTER_BITS,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@SA2_DRILL_BITS@') AS DRILL_BITS,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@SA3_SANDPAPER@')  AS SANDPAPER,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@SA4_FOAM@')       AS FOAM,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@SA5_PALETTS@')    AS PALLETS,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT1_CODE@')     AS TNUT1_CODE,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT1_QTY@')      AS TNUT1_QTY,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT2_CODE@')     AS TNUT2_CODE,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT2_QTY@')      AS TNUT2_QTY,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT3_CODE@')     AS TNUT3_CODE,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT3_QTY@')      AS TNUT3_QTY,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT4_CODE@')     AS TNUT4_CODE,
          DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@TNUT4_QTY@')      AS TNUT4_QTY
        FROM VCeduleMachine VC
        INNER JOIN AUTOFAB_cNOMENCOP CNOP ON CNOP.NOPSEQ = VC.CNOMENCOP
        WHERE VC.TRANSAC = @transac
      `);

    if (!varResult.recordset.length) {
      return res.json({ success: true, data: [], message: "No accessories found" });
    }

    const v = varResult.recordset[0];
    const accessories = [];

    // Step 2: Fixed accessory types — all hidden; only T-NUT lookups are shown
    const fixedItems = [];

    for (const item of fixedItems) {
      const qty = Math.ceil(parseFloat(v[item.key]) || 0);
      if (qty >= 1) {
        accessories.push({ qty, description_fr: item.fr, description_en: item.en });
      }
    }

    // Step 3: T-NUT accessories — look up description in INVENTAIRE (primary DB)
    for (let i = 1; i <= 4; i++) {
      const code = (v[`TNUT${i}_CODE`] || "").trim();
      const qty  = Math.ceil(parseFloat(v[`TNUT${i}_QTY`]) || 0);
      if (qty >= 1 && code) {
        const invResult = await poolPrimary
          .request()
          .input("code", sql.VarChar(20), code.substring(0, 20))
          .query(`SELECT INDESC1, INDESC2 FROM INVENTAIRE WHERE INNOINV = @code`);
        if (invResult.recordset.length) {
          const inv = invResult.recordset[0];
          accessories.push({
            qty,
            description_fr: inv.INDESC1 ? inv.INDESC1.toUpperCase() : null,
            description_en: inv.INDESC2 ? inv.INDESC2.toUpperCase() : null,
          });
        } else {
          // Fallback: show the raw code if INVENTAIRE lookup fails
          accessories.push({ qty, description_fr: code.toUpperCase(), description_en: code.toUpperCase() });
        }
      }
    }

    res.json({
      success: true,
      data: accessories,
      message: `Retrieved ${accessories.length} accessories`,
    });
  })
);

// ─── GET /getStopCauses.cfm ──────────────────────────────────────────────────
app.get(
  "/getStopCauses.cfm",
  handler(async (req, res) => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT QACPSEQ AS id, QACPDESCRIPTION_P AS description_P, QACPDESCRIPTION_S AS description_S
      FROM QA_CAUSEP
      ORDER BY QACPDESCRIPTION_P
    `);
    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} primary causes`,
    });
  })
);

// ─── GET /getSecondaryCauses.cfm ─────────────────────────────────────────────
app.get(
  "/getSecondaryCauses.cfm",
  handler(async (req, res) => {
    const primaryId = parseInt(req.query.primaryId) || 0;
    if (!primaryId) {
      return res.json({
        success: true,
        data: [],
        message: "No primaryId provided",
      });
    }
    const pool = await getPool();
    const result = await pool
      .request()
      .input("primaryId", sql.Int, primaryId).query(`
        SELECT QACSSEQ AS id, QACSDESCRIPTION_P AS description_P, QACSDESCRIPTION_S AS description_S
        FROM QA_CAUSES
        WHERE QA_CAUSEP = @primaryId
        ORDER BY QACSDESCRIPTION_P
      `);
    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} secondary causes`,
    });
  })
);

// ─── GET /getDefectTypes.cfm ─────────────────────────────────────────────────
app.get(
  "/getDefectTypes.cfm",
  handler(async (req, res) => {
    const fmcode = (req.query.fmcode || "").toUpperCase();
    const pool = await getPool();

    // Base filter: all defect-type reasons (RRTYPE contains 14)
    // Plus machine-family-specific types based on fmcode
    let familyFilter = "";
    if (fmcode) {
      const conditions = [
        // Common types always included when fmcode is provided
        "RRDESC_S LIKE 'Raw-Material%'",
        "RRDESC_S LIKE 'Visual%'",
      ];
      if (fmcode.includes("PRESS")) {
        conditions.push("RRCODE LIKE 'SCRAP-PRS%'");
        conditions.push("RRDESC_P LIKE 'Presse%'");
      }
      if (fmcode.includes("CNC")) {
        conditions.push("RRCODE LIKE 'SCRAP-CNC%'");
        conditions.push("RRDESC_P LIKE 'Usinage%'");
      }
      if (fmcode.includes("SAND")) {
        conditions.push("RRCODE LIKE 'SCRAP-SND%'");
      }
      if (fmcode.includes("PACK")) {
        conditions.push("RRCODE LIKE 'SCRAP-PKG%'");
        conditions.push("RRDESC_P LIKE 'Emballage%'");
      }
      if (fmcode.includes("VENPR")) {
        conditions.push("RRTYPE LIKE '%3%'");
        conditions.push("RRTYPE LIKE '%20%'");
      }
      familyFilter = `AND (${conditions.join(" OR ")})`;
    }

    const result = await pool.request().query(`
      SELECT RRSEQ AS id, RRCODE AS code, RRDESC_P AS description_P, RRDESC_S AS description_S, RRTYPE AS type
      FROM RAISON
      WHERE RRTYPE LIKE '%14%'
      ${familyFilter}
      ORDER BY RRDESC_P
    `);
    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} defect types`,
    });
  })
);

// ─── GET /getPanelData.cfm ───────────────────────────────────────────────────
app.get(
  "/getPanelData.cfm",
  handler(async (req, res) => {
    const transac = parseInt(req.query.transac) || 0;
    const panelNiSeq = parseInt(req.query.panelNiSeq) || 0;

    if (!transac) {
      return res.json({ success: false, error: "transac parameter is required" });
    }

    // Always log here — check the terminal where `node server/api.cjs` runs (not browser DevTools).
    console.log(
      `[getPanelData] transac=${transac} panelNiSeq=${panelNiSeq} | panel detail query will ${panelNiSeq ? "run" : "SKIP (panelNiSeq is 0 — no NISEQ/thickness log)"}`
    );

    const pool = await getPool();

    // 1) Panel detail — the PANEL row from cNOMENCLATURE
    let panelDetail = null;
    if (panelNiSeq) {
      const detailResult = await pool
        .request()
        .input("panelNiSeq", sql.Int, panelNiSeq)
        .query(`
          SELECT cn.NISEQ, cn.INVENTAIRE_P_INNOINV AS ITEM,
                 cn.INVENTAIRE_P AS ITEM_SEQ,
                 cn.INVENTAIRE_M_INNOINV AS PANNEAU,
                 cn.INVENTAIRE_M AS PANNEAU_SEQ,
                 cn.INVENTAIRE_M_INDESC1 AS DESCRIPTION_P,
                 cn.INVENTAIRE_M_INDESC2 AS DESCRIPTION_S,
                 INV_P.INPOIDS AS POIDS,
                 INV.INREV AS VER,
                 CI.CRCRITERE_7 AS TYPE,
                 CI.CRCRITERE_5 AS THICKNESS
          FROM cNOMENCLATURE cn
          LEFT JOIN CRITERE_INV CI ON CI.INVENTAIRE = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV ON INV.INSEQ = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV_P ON INV_P.INSEQ = cn.INVENTAIRE_P
          WHERE cn.NISEQ = @panelNiSeq
        `);
      if (detailResult.recordset.length) {
        const raw = detailResult.recordset[0];
        const rawThickness = raw.THICKNESS;
        const displayedThickness = (() => {
          const v = rawThickness;
          if (v == null || v === "") return null;
          if (typeof v === "number" && v > 0) return decimalToFraction(v);
          const s = String(v).trim();
          // CRCRITERE_5 may already be a fraction string (e.g. "7/16").
          // parseFloat("7/16") === 7 — would wrongly run decimalToFraction(7) → garbage like "14/2".
          if (/^\d+\s*\/\s*\d+$/.test(s)) {
            return s.replace(/\s*\/\s*/, "/");
          }
          const n = parseFloat(s.replace(",", "."));
          if (!Number.isNaN(n) && n > 0) return decimalToFraction(n);
          return s || null;
        })();
        console.log(
          `[getPanelData] NISEQ=${panelNiSeq} | THICKNESS (CRCRITERE_5) raw=`,
          rawThickness,
          "| displayed=",
          displayedThickness
        );
        panelDetail = {
          ...raw,
          THICKNESS_RAW: rawThickness,
          THICKNESS: displayedThickness,
        };
      } else {
        console.log(`[getPanelData] NISEQ=${panelNiSeq} | No row returned from cNOMENCLATURE`);
      }
    }

    // 2) Panel layers — FACE/VENEER rows from cNOMENCLATURE + CRITERE_INV
    const layersResult = await pool
      .request()
      .input("transac", sql.Int, transac)
      .query(`
        SELECT cn.NIRANG, cn.NILONGUEUR, cn.NILARGEUR, cn.NIEPAISSEUR,
               cn.NIVALEUR_CHAR1, cn.NIVALEUR_CHAR2, cn.NIVALEUR_CHAR3,
               cn.NIVALEUR_FLOAT3 AS GLUE_VAL,
               cn.INVENTAIRE_M_INDESC1 AS SPECIES_P,
               cn.INVENTAIRE_M_INDESC2 AS SPECIES_S,
               cn.INVENTAIRE_P_INNOINV,
               cn.NISTR_NIVEAU,
               CI.CRCRITERE_1, CI.CRCRITERE_3 AS GRADE,
               CI.CRCRITERE_4 AS CUT, CI.CRCRITERE_6 AS SUBCATEGORY,
               CI.CRCRITERE_7 AS TYPE
        FROM cNOMENCLATURE cn
        INNER JOIN CRITERE_INV CI ON CI.INVENTAIRE = cn.INVENTAIRE_M
        WHERE cn.TRANSAC = @transac
          AND cn.NIREGRP_PROD1 IN ('FACE', 'VENEER')
          AND cn.INVENTAIRE_P_INNOINV NOT LIKE 'FA%'
        ORDER BY cn.NISTR_NIVEAU, cn.NIRANG
      `);

    // 3) Group header — first PANEL row description for the group header
    let groupHeader = { code: "", desc: "" };
    if (panelNiSeq) {
      const ghResult = await pool
        .request()
        .input("panelNiSeq", sql.Int, panelNiSeq)
        .query(`
          SELECT cn.INVENTAIRE_M_INDESC1 AS DESC_P, cn.INVENTAIRE_M_INDESC2 AS DESC_S,
                 cn.INVENTAIRE_M_INNOINV AS PANNEAU
          FROM cNOMENCLATURE cn
          WHERE cn.NISEQ = @panelNiSeq
        `);
      if (ghResult.recordset.length) {
        const gh = ghResult.recordset[0];
        groupHeader = { code: gh.PANNEAU || "", desc: gh.DESC_P || "" };
      }
    }

    // 4) Convert decimal thickness to fraction string
    function decimalToFraction(val) {
      if (!val || val <= 0) return "";
      // Try common denominators used in woodworking: 2,4,8,16,21,32,42,64
      const denoms = [2, 4, 8, 16, 21, 32, 42, 64];
      for (const d of denoms) {
        const n = Math.round(val * d);
        if (n > 0 && Math.abs(n / d - val) < 0.001) {
          return `${n}/${d}`;
        }
      }
      // Fallback: show decimal rounded to 4 places
      return String(Math.round(val * 10000) / 10000);
    }

    // Map layers to frontend shape
    const layers = layersResult.recordset.map((r) => {
      // Cut abbreviation
      let cut = r.CUT || "";
      if (/rotary|d[ée]roul/i.test(cut)) cut = "RC";
      else if (/quarter/i.test(cut)) cut = "QC";
      else if (/flat/i.test(cut)) cut = "FC";
      else if (/rift/i.test(cut)) cut = "RC";
      else if (/slip/i.test(cut)) cut = "SM";

      // Thickness — convert decimal to fraction
      const thickness = decimalToFraction(r.NIEPAISSEUR);

      // Grain direction
      const grain = r.NIVALEUR_CHAR1 || "";

      // Tape: "taped" → "Oui", else "Non"
      const tape = r.NIVALEUR_CHAR3 && /taped/i.test(r.NIVALEUR_CHAR3) ? "Oui" : "Non";

      // Sand: "sanded" or grade is "FACE" → "Oui"
      const sand =
        (r.NIVALEUR_CHAR2 && /sanded/i.test(r.NIVALEUR_CHAR2)) ||
        (r.GRADE && /face/i.test(r.GRADE))
          ? "Oui"
          : "Non";

      // Glue: if NIVALEUR_FLOAT3 != 0, show value
      const glue = r.GLUE_VAL && r.GLUE_VAL !== 0 ? "Non" : "Non";

      return {
        NIRANG: r.NIRANG,
        NILONGUEUR: r.NILONGUEUR,
        NILARGEUR: r.NILARGEUR,
        SPECIES: r.SPECIES_P || "",
        GRADE: r.GRADE || "",
        CUT: cut,
        THICKNESS: thickness,
        GRAIN: grain,
        P_LAM: r.SUBCATEGORY || "",
        GLUE: glue,
        TAPE: tape,
        SAND: sand,
      };
    });

    res.json({
      success: true,
      data: { panelDetail, layers, groupHeader },
      message: `Retrieved panel data: ${layers.length} layers`,
    });
  })
);

// ─── GET /getDrawings.cfm ───────────────────────────────────────────────────
app.get(
  "/getDrawings.cfm",
  handler(async (req, res) => {
    const produitSeq = parseInt(req.query.produitSeq) || 0;
    const inventaireSeq = parseInt(req.query.inventaireSeq) || 0;
    const kitSeq = parseInt(req.query.kitSeq) || 0;

    if (!produitSeq && !inventaireSeq && !kitSeq) {
      return res.json({ success: true, data: [], message: "No seq provided" });
    }

    const pool = await getPool();

    // Try in order: produit → inventaire (panel) → kit
    const seqsToTry = [produitSeq, inventaireSeq, kitSeq].filter(Boolean);

    for (const seq of seqsToTry) {
      const result = await pool
        .request()
        .input("seq", sql.Int, seq)
        .query(`
          SELECT DOSEQ, DOFICHIER, DOSEQ_REFERENCE
          FROM DOCUMENT
          WHERE DONOM_TABLE = 'INVENTAIRE'
            AND DOSEQ_REFERENCE = @seq
            AND DOFICHIER IS NOT NULL
          ORDER BY DOSEQ
        `);

      if (result.recordset.length > 0) {
        // Convert file paths to web-accessible URLs
        const docs = result.recordset.map((row) => ({
          doseq: row.DOSEQ,
          filePath: row.DOFICHIER,
          // Serve via our local /doc/:doseq endpoint
          url: `/doc/${row.DOSEQ}`,
        }));
        return res.json({
          success: true,
          data: docs,
          message: `Found ${docs.length} documents`,
        });
      }
    }

    res.json({ success: true, data: [], message: "No documents found" });
  })
);

// ─── GET /doc/:doseq — serve document file from network share ───────────────
const fs = require("fs");
const pathModule = require("path");

app.get(
  "/doc/:doseq",
  handler(async (req, res) => {
    const doseq = parseInt(req.params.doseq) || 0;
    if (!doseq) {
      return res.status(400).json({ success: false, error: "Invalid doseq" });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("doseq", sql.Int, doseq)
      .query(`SELECT DOFICHIER FROM DOCUMENT WHERE DOSEQ = @doseq`);

    if (!result.recordset.length || !result.recordset[0].DOFICHIER) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    const filePath = result.recordset[0].DOFICHIER;

    // Check if file exists on network share
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({
        success: false,
        error: "File not accessible: " + filePath,
      });
    }

    // Determine content type
    const ext = pathModule.extname(filePath).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".tif": "image/tiff",
      ".tiff": "image/tiff",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const stat = await fs.promises.stat(filePath);
    res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", "inline");
    fs.createReadStream(filePath).pipe(res);
  })
);

// ─── Shared file-serving helper ──────────────────────────────────────────────
const FILE_CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".webm": "video/webm",
};

async function serveFilePath(filePath, res) {
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return res.status(404).json({ success: false, error: "File not accessible: " + filePath });
  }
  const ext = pathModule.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", FILE_CONTENT_TYPES[ext] || "application/octet-stream");
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Disposition", "inline");
  fs.createReadStream(filePath).pipe(res);
}

// ─── GET /doc-methode/:metseq/:field — serve METHODE PDF/video file ───────────
// field: pdf_p | pdf_s | video_p | video_s
const METHODE_FIELD_MAP = {
  pdf_p:   "METFICHIER_PDF_P",
  pdf_s:   "METFICHIER_PDF_S",
  video_p: "METVIDEO_P",
  video_s: "METVIDEO_S",
};

app.get(
  "/doc-methode/:metseq/:field",
  handler(async (req, res) => {
    const metseq = parseInt(req.params.metseq) || 0;
    const col = METHODE_FIELD_MAP[req.params.field];
    if (!metseq || !col) {
      return res.status(400).json({ success: false, error: "Invalid params" });
    }
    const pool = await getPool();
    const result = await pool
      .request()
      .input("metseq", sql.Int, metseq)
      .query(`SELECT ${col} AS FILEPATH FROM METHODE WHERE METSEQ = @metseq`);

    if (!result.recordset.length || !result.recordset[0].FILEPATH) {
      return res.status(404).json({ success: false, error: "File path not found" });
    }
    await serveFilePath(result.recordset[0].FILEPATH, res);
  })
);

// ─── GET /doc-methode-images/:metseq — list DET_METHODE images for a step ────
app.get(
  "/doc-methode-images/:metseq",
  handler(async (req, res) => {
    const metseq = parseInt(req.params.metseq) || 0;
    if (!metseq) return res.status(400).json({ success: false, error: "Invalid metseq" });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("metseq", sql.Int, metseq)
      .query(`
        SELECT DMDESC_P, DMDESC_S, DMFICHIER
        FROM DET_METHODE
        WHERE METHODE = @metseq
        ORDER BY DMDESC_P
      `);

    const images = result.recordset.map((row) => ({
      descP: row.DMDESC_P,
      descS: row.DMDESC_S,
      url: `/api/doc-raw-file?path=${encodeURIComponent(row.DMFICHIER)}`,
    }));

    res.json({ success: true, data: { images } });
  })
);

// ─── GET /doc-raw-file — serve any file by path (validated against doc roots) ─
// Files must be within the known document root paths (V:\AUTOFAB... or \\seapro\...)
const ALLOWED_PATH_PREFIXES = [
  "v:\\autofab",   // V:\AUTOFAB... and V:\AUTOFABTEST...
  "\\\\seapro\\",  // UNC: \\seapro\...
  "c:\\sites\\",   // CF server local: c:\sites\...
];

app.get(
  "/doc-raw-file",
  handler(async (req, res) => {
    const rawPath = decodeURIComponent(req.query.path || "");
    if (!rawPath) return res.status(400).json({ success: false, error: "Missing path" });

    const lower = rawPath.toLowerCase().replace(/\//g, "\\");
    const allowed = ALLOWED_PATH_PREFIXES.some((p) => lower.startsWith(p));
    if (!allowed) {
      return res.status(403).json({ success: false, error: "Access denied: path not in allowed roots" });
    }

    await serveFilePath(rawPath, res);
  })
);

// ─── GET /getDepartments.cfm ─────────────────────────────────────────────────
app.get(
  "/getDepartments.cfm",
  handler(async (req, res) => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DESEQ, DECODE, DEDESCRIPTION_P, DEDESCRIPTION_S
      FROM DEPARTEMENT
      WHERE DEVOIRDANSUSINE = 1
      ORDER BY DEDESCRIPTION_P
    `);
    res.json({ success: true, data: result.recordset });
  })
);

// ─── GET /getAvailableMachines.cfm ───────────────────────────────────────────
// Returns machines available for a given family + department (operation screen dropdown).
// Replicates old tableau.cfc:78 ListeMachines query.
app.get(
  "/getAvailableMachines.cfm",
  handler(async (req, res) => {
    const famillemachine = parseInt(req.query.famillemachine) || 0;
    const departement = parseInt(req.query.departement) || 0;
    const pool = await getPool();
    const result = await pool.request()
      .input("fm", sql.Int, famillemachine)
      .input("dept", sql.Int, departement)
      .query(`
        SELECT MASEQ, MACODE, MADESC_S, MADESC_P
        FROM MACHINE
        WHERE FamilleMachine = @fm AND DEPARTEMENT = @dept
        ORDER BY MADESC_P
      `);
    res.json({ success: true, data: result.recordset });
  })
);

// ─── GET /changeMachine.cfm ─────────────────────────────────────────────────
// Updates the machine assignment for an operation.
// Replicates old operation.cfc:afficheMachineAttribuee (lines 1649-1684).
app.get(
  "/changeMachine.cfm",
  handler(async (req, res) => {
    const machineId = parseInt(req.query.machine) || 0;
    const copmachine = parseInt(req.query.copmachine) || 0;
    const nopseq = parseInt(req.query.nopseq) || 0;

    if (!machineId) {
      return res.json({ success: false, error: "machine parameter is required" });
    }

    const pool = await getPool();

    // Get machine details
    const machineResult = await pool.request()
      .input("m", sql.Int, machineId)
      .query(`SELECT MASEQ, MACODE, MADESC_S, MADESC_P FROM MACHINE WHERE MASEQ = @m`);

    if (!machineResult.recordset.length) {
      return res.json({ success: false, error: "Machine not found" });
    }

    // Update cNomencOp_Machine (always runs — matches old software)
    await pool.request()
      .input("m", sql.Int, machineId)
      .input("cop", sql.Int, copmachine)
      .query(`UPDATE cNomencOp_Machine SET MACHINE = @m WHERE CNOM_SEQ = @cop`);

    // Update PL_RESULTAT (always runs — matches old software)
    const plReq = pool.request()
      .input("m", sql.Int, machineId)
      .input("nop", sql.Int, nopseq);
    if (copmachine) {
      plReq.input("cop", sql.Int, copmachine);
      await plReq.query(`
        UPDATE PL_RESULTAT SET MACHINE = @m
        WHERE CNOMENCOP = @nop AND CNOMENCOP_MACHINE = @cop
      `);
    } else {
      await plReq.query(`
        UPDATE PL_RESULTAT SET MACHINE = @m
        WHERE CNOMENCOP = @nop
      `);
    }

    res.json({
      success: true,
      data: machineResult.recordset[0],
      message: "Machine updated successfully",
    });
  })
);

// ─── GET /getMachines.cfm ────────────────────────────────────────────────────
// Returns all visible machines for the Production Time machine filter dropdown.
// Mirrors old CF: operation.cfc → afficheDiv trouveMachines query
// Joins FAMILLEMACHINE → MACHINE, filtered by FMVOIRDANSUSINE = 1
app.get(
  "/getMachines.cfm",
  handler(async (req, res) => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT MA.MASEQ, MA.MACODE, MA.MADESC_P, MA.MADESC_S, MA.DEPARTEMENT
      FROM FAMILLEMACHINE FM WITH (NOLOCK)
      INNER JOIN MACHINE MA WITH (NOLOCK) ON MA.FAMILLEMACHINE = FM.FMSEQ
      WHERE FM.FMVOIRDANSUSINE = 1
      ORDER BY MA.MADESC_P
    `);
    res.json({ success: true, data: result.recordset });
  })
);

// ─── GET /getLabelPdf.cfm ────────────────────────────────────────────────────
app.get(
  "/getLabelPdf.cfm",
  handler(async (req, res) => {
    // Dev mock: return sample PDF served by Vite dev server
    res.json({
      success: true,
      data: { pdfUrl: "/sample-label.pdf" },
      message: "Label PDF generated",
    });
  })
);

// ─── GET /getOrderLabels.cfm ─────────────────────────────────────────────────
app.get(
  "/getOrderLabels.cfm",
  handler(async (req, res) => {
    let transac = parseInt(req.query.transac) || 0;
    const copmachine = parseInt(req.query.copmachine) || 0;
    const noProdParam = req.query.noProd ? String(req.query.noProd).trim() : "";

    // Look up TRANSAC by NO_PROD if no transac provided
    if (!transac && noProdParam) {
      const pool = await getPool();
      const lookupResult = await pool
        .request()
        .input("noProd", sql.VarChar(30), noProdParam)
        .query(`
          SELECT TOP 1 TRSEQ
          FROM TRANSAC
          WHERE DBO.FctFormatNoProd(TRNO, TRITEM) = @noProd
          ORDER BY TRSEQ DESC
        `);
      if (lookupResult.recordset.length > 0) {
        transac = lookupResult.recordset[0].TRSEQ;
      } else {
        return res.json({ success: false, error: "Order not found" });
      }
    }

    if (!transac) {
      return res.json({ success: false, error: "transac or noProd parameter is required" });
    }

    const pool = await getPool();

    // Derive NOPSEQ and OPCODE from copmachine if provided
    let nopseq = 0;
    let currentOpcode = null;
    if (copmachine) {
      const nopResult = await pool
        .request()
        .input("copmachine", sql.Int, copmachine)
        .query(`
          SELECT TOP 1 cm.CNOMENCOP, tp.OPERATION_OPCODE
          FROM CNOMENCOP_MACHINE cm
          LEFT JOIN TEMPSPROD tp ON tp.CNOMENCOP = cm.CNOMENCOP
            AND tp.OPERATION_OPCODE IN ('PRESS','CNC','SAND','PACK')
          WHERE cm.CNOM_SEQ = @copmachine
        `);
      if (nopResult.recordset.length > 0) {
        nopseq = nopResult.recordset[0].CNOMENCOP;
        currentOpcode = nopResult.recordset[0].OPERATION_OPCODE ?? null;
      }
    }

    // Table 1: Finished product container labels (LesContenants + LesDetails merged)
    const fpQuery = pool.request().input("transac", sql.Int, transac);
    let fpSql = `
      SELECT DISTINCT
        dc.CONTENANT, dc.DCO_QTE_INV, dc.INVENTAIRE,
        con.CON_NUMERO, i.INNOINV, i.INDESC1, i.INDESC2,
        T_EPF.TRSEQ AS TRSEQ_EPF, T_EPF.TRQTEUNINV,
        DTR_EPF.DTRQTE, DTR_EPF.NO_SERIE_NSNO_SERIE,
        (SELECT TOP 1 TP2.TJFINDATE FROM TEMPSPROD TP2
         WHERE TP2.TRANSAC = T_CO.TRSEQ AND TP2.OPERATION_OPCODE = 'PACK'
         ORDER BY TP2.TJFINDATE DESC) AS PACK_DATE
      FROM COMMANDE CO
      INNER JOIN TRANSAC T_CO ON T_CO.TRNO = CO.CONOTRANS
      INNER JOIN TEMPSPROD TP ON T_CO.TRSEQ = TP.TRANSAC
      INNER JOIN CNOMENCLATURE CNO ON CNO.TRANSAC = T_CO.TRSEQ
      LEFT JOIN CNOMENCOP COP ON CNO.NISEQ = COP.CNOMENCLATURE
      INNER JOIN TRANSAC T_EPF ON T_EPF.TRANSAC = T_CO.TRSEQ AND T_EPF.TRNO_EQUATE = 5
      INNER JOIN DET_TRANS DTR_EPF ON DTR_EPF.TRANSAC = T_EPF.TRSEQ
      INNER JOIN DET_CONTENANT dc ON DTR_EPF.CONTENANT = dc.CONTENANT
        AND DTR_EPF.NO_SERIE_NSNO_SERIE = dc.NO_SERIE_NSNO_SERIE
      INNER JOIN CONTENANT con ON con.CON_SEQ = dc.CONTENANT
      INNER JOIN INVENTAIRE i ON dc.INVENTAIRE = i.INSEQ
      WHERE T_CO.TRSEQ = @transac
        AND dc.DCO_QTE_INV > 0
    `;
    if (nopseq) {
      fpQuery.input("nopseq", sql.Int, nopseq);
      fpSql += ` AND TP.CNOMENCOP = @nopseq`;
    }
    const fpResult = await fpQuery.query(fpSql);

    // Table 2: Operation labels — PRESS, CNC, SAND, PACK from TEMPSPROD
    const opResult = await pool
      .request()
      .input("transac2", sql.Int, transac)
      .query(`
        SELECT TP.TJSEQ, TP.TRANSAC, TP.OPERATION, TP.OPERATION_OPCODE,
               TP.OPERATION_OPDESC_P, TP.OPERATION_OPDESC_S,
               TP.TJDEBUTDATE, TP.TJFINDATE, TP.TJQTEPROD, TP.TJQTEDEFECT,
               TP.CNOMENCOP, TP.cNomencOp_Machine,
               TP.TRANSAC_TRNO, TP.TRANSAC_TRITEM,
               TP.MACHINE_MACODE, TP.MACHINE_MADESC_P, TP.MACHINE_MADESC_S,
               TP.EMPLOYE_EMNO, TP.EMPLOYE_EMNOM,
               FORMAT(TP.TJFINDATE, 'HH:MM') AS TIME
        FROM TEMPSPROD TP
        WHERE TP.TRANSAC = @transac2
          AND TP.TJQTEPROD <> 0
          AND (TP.MODEPROD_MPCODE = 'PROD' OR TP.MODEPROD_MPCODE = 'STOP' OR TP.MODEPROD_MPCODE = 'COMP')
          AND TP.OPERATION_OPCODE IN ('PRESS', 'CNC', 'SAND', 'PACK')
        ORDER BY TP.CNOMENCOP, TP.TJFINDATE
      `);

    const noProdResult = await pool
      .request()
      .input("transac3", sql.Int, transac)
      .query(`SELECT DBO.FctFormatNoProd(TRNO, TRITEM) AS NO_PROD FROM TRANSAC WHERE TRSEQ = @transac3`);
    const noProd = noProdResult.recordset[0]?.NO_PROD ?? null;

    res.json({
      success: true,
      data: {
        finishedProducts: fpResult.recordset,
        operations: opResult.recordset,
        currentOpcode,
        noProd,
      },
      message: "Labels retrieved",
    });
  })
);

// ─── POST /submitQuestionnaire.cfm ───────────────────────────────────────────
// Mirrors legacy CF: QuestionnaireSortie.cfc → ModifieTEMPSPROD (lines 599-1293)
// Uses the EXACT same stored procedures as the old software.
// AUDIT FIXES: stop-cause row, DET_DEFECT fields, SMNOTRANS pass-through,
//   employee on both rows, prev-PROD cost recalc, cNOMENCOP qty sync,
//   TJVALEUR_MATIERE + KPI insert, accept nopseq from frontend.
app.post(
  "/submitQuestionnaire.cfm",
  handler(async (req, res) => {
    const {
      transac,
      copmachine,
      type, // "stop" or "comp"
      employeeCode,
      goodQty,
      primaryCause,
      secondaryCause,
      notes,
      moldAction,
      defects,
      finishedProducts,
      nopseq: frontendNopseq, // Fix 8: accept nopseq from frontend
      isVcut: frontendIsVcut, // VCUT operations skip changeTEMPSPROD
      listeTjseq: frontendListeTjseq, // VCUT: comma-separated TJSEQ list
      listeEpfSeq: frontendListeEpfSeq, // VCUT: comma-separated EPF seq list
      smnotrans: frontendSmnotrans, // VCUT: SM transaction number
    } = req.body;

    const pool = await getPool();
    const isStop = type === "stop";
    const isComp = type === "comp";
    const qteBonne = Number(goodQty) || 0;
    // NOTE: With write-as-you-go pattern, defects are already in the DB (via addDefect.cfm).
    // We read the actual defect total from TEMPSPROD after finding the PROD row below.

    // ── Find the last PROD TEMPSPROD record (mirrors CF line 657-668)
    let copWhere = "";
    const tpReq = pool.request().input("transac", sql.Int, transac);
    if (copmachine && Number(copmachine) > 0) {
      tpReq.input("copmachine", sql.Int, Number(copmachine));
      copWhere = "AND TP.cNOMENCOP_MACHINE = @copmachine";
    }
    const tpResult = await tpReq.query(`
      SELECT TOP 1 TP.TJSEQ, TP.CNOMENCOP, TP.SMNOTRANS,
             TP.ENTRERPRODFINI_PFNOTRANS, TP.CNOMENCLATURE,
             TP.TJQTEPROD, TP.TJQTEDEFECT, TP.MODEPROD_MPCODE,
             TP.EMPLOYE, TP.OPERATION, TP.MACHINE, TP.INVENTAIRE_C,
             TP.TJDEBUTDATE, TP.TJFINDATE,
             TP.cNomencOp_Machine,
             CNOP.NOPSEQ, CNOP.TRANSAC AS NOP_TRANSAC
      FROM TEMPSPROD TP
      INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = TP.CNOMENCOP
      WHERE TP.TRANSAC = @transac
        AND TP.MODEPROD_MPCODE = 'PROD'
        AND TP.TJNOTE LIKE 'Ecran de production pour Temps prod%'
        ${copWhere}
      ORDER BY TP.TJSEQ DESC
    `);

    if (!tpResult.recordset.length) {
      const debugResult = await pool.request()
        .input("transac", sql.Int, transac)
        .query(`
          SELECT TOP 5 TJSEQ, MODEPROD_MPCODE, TJDEBUTDATE, TJFINDATE,
                 cNomencOp_Machine, TJQTEPROD, TJQTEDEFECT
          FROM TEMPSPROD WHERE TRANSAC = @transac
          ORDER BY TJDEBUTDATE DESC
        `);
      console.log("[submitQuestionnaire] DEBUG - no PROD record found. transac:", transac, "copmachine:", copmachine);
      console.log("[submitQuestionnaire] DEBUG - existing records:", JSON.stringify(debugResult.recordset, null, 2));
      return res.json({ success: false, error: "No active PROD record found for this operation" });
    }

    const tp = tpResult.recordset[0];
    const tjseq = tp.TJSEQ; // This is the PROD row TJSEQ
    // Fix 8: prefer frontend nopseq, fall back to join result
    const nopseq = Number(frontendNopseq) || tp.NOPSEQ || tp.CNOMENCOP;

    // Read actual defect total from TEMPSPROD (already written by addDefect.cfm in write-as-you-go mode)
    const qteDefect = tp.TJQTEDEFECT || 0;

    console.log(`[submitQuestionnaire] TJSEQ=${tjseq} type=${type} good=${qteBonne} defect=${qteDefect} transac=${transac} copmachine=${copmachine} mpcode=${tp.MODEPROD_MPCODE} nopseq=${nopseq} isVcut=${frontendIsVcut} listeTjseq=${frontendListeTjseq} listeEpfSeq=${frontendListeEpfSeq} smnotrans=${frontendSmnotrans}`);

    // ── Fix 1: Find the STOP row (MODEPROD=8) for saving causes and employee
    // The old software finds the STOP row created by changeStatus.cfm
    let stopTjseq = null;
    if (isStop) {
      const stopReq = pool.request().input("transac", sql.Int, transac);
      stopReq.input("nopseq", sql.Int, nopseq);
      let stopCopWhere = "";
      if (copmachine && Number(copmachine) > 0) {
        stopReq.input("copmachine", sql.Int, Number(copmachine));
        stopCopWhere = "AND cNOMENCOP_MACHINE = @copmachine";
      }
      const stopResult = await stopReq.query(`
        SELECT TOP 1 TJSEQ FROM TEMPSPROD
        WHERE TRANSAC = @transac
          AND CNOMENCOP = @nopseq
          ${stopCopWhere}
          AND MODEPROD = 8
        ORDER BY TJSEQ DESC
      `);
      stopTjseq = stopResult.recordset[0]?.TJSEQ || null;
      console.log(`[submitQuestionnaire] STOP row TJSEQ=${stopTjseq}`);
    }

    // ── STEP 1: Reset TJPROD_TERMINE flag (line 686)
    await pool.request()
      .input("transac", sql.Int, transac)
      .input("nopseq", sql.Int, nopseq)
      .query(`
        UPDATE TEMPSPROD
        SET TJPROD_TERMINE = 0
        WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND TJPROD_TERMINE = 1
      `);

    // ── STEP 2: Update employee on BOTH the STOP/COMP row AND the PROD row (Fix 4)
    let employeeSeq = tp.EMPLOYE || 0;
    if (employeeCode) {
      const empResult = await pool.request()
        .input("emnoident", sql.VarChar(20), String(employeeCode))
        .query(`SELECT EMSEQ, EMNO, EMNOM FROM EMPLOYE WHERE EMNOIDENT = @emnoident`);
      if (empResult.recordset.length) {
        const emp = empResult.recordset[0];
        employeeSeq = emp.EMSEQ;

        // Update employee on the STOP/COMP row first (old software line 700-706)
        if (stopTjseq) {
          await pool.request()
            .input("tjseq", sql.Int, stopTjseq)
            .input("employe", sql.Int, emp.EMSEQ)
            .input("emno", sql.VarChar(20), String(emp.EMNO))
            .input("emnom", sql.VarChar(100), emp.EMNOM)
            .query(`
              UPDATE TEMPSPROD
              SET EMPLOYE = @employe, EMPLOYE_EMNO = @emno, EMPLOYE_EMNOM = @emnom
              WHERE TJSEQ = @tjseq
            `);
        }

        // Update employee on the PROD row (old software ChangeTEMPSPROD line 1670-1678)
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .input("employe", sql.Int, emp.EMSEQ)
          .input("emno", sql.VarChar(20), String(emp.EMNO))
          .input("emnom", sql.VarChar(100), emp.EMNOM)
          .query(`
            UPDATE TEMPSPROD
            SET EMPLOYE = @employe, EMPLOYE_EMNO = @emno, EMPLOYE_EMNOM = @emnom
            WHERE TJSEQ = @tjseq
          `);
      }
    }

    // ── STEP 3: Record stop causes on the STOP row (Fix 1 — was incorrectly on PROD row)
    // Old software saves causes on the STOP row (MODEPROD=8), not the PROD row
    if (isStop && primaryCause && stopTjseq) {
      const existsResult = await pool.request()
        .input("tjseq", sql.Int, stopTjseq)
        .query(`SELECT TEMPSPROD FROM TEMPSPRODEX WHERE TEMPSPROD = @tjseq`);
      if (existsResult.recordset.length) {
        await pool.request()
          .input("tjseq", sql.Int, stopTjseq)
          .input("causeP", sql.Int, Number(primaryCause))
          .input("causeS", sql.Int, Number(secondaryCause) || 0)
          .input("note", sql.VarChar(500), notes || "")
          .query(`UPDATE TEMPSPRODEX SET QA_CAUSEP = @causeP, QA_CAUSES = @causeS, EXTPRD_NOTE = @note WHERE TEMPSPROD = @tjseq`);
      } else {
        await pool.request()
          .input("tjseq", sql.Int, stopTjseq)
          .input("causeP", sql.Int, Number(primaryCause))
          .input("causeS", sql.Int, Number(secondaryCause) || 0)
          .input("note", sql.VarChar(500), notes || "")
          .query(`INSERT INTO TEMPSPRODEX (TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE) VALUES (@tjseq, @causeP, @causeS, @note)`);
      }
    }

    // Get server local date/time once (avoids timezone issues with JS Date)
    const dateTimeResult = await pool.request().query(`
      SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS dateNow, FORMAT(GETDATE(), 'HH:mm:ss') AS timeNow
    `);
    const { dateNow, timeNow } = dateTimeResult.recordset[0];

    // ── STEP 4: Update quantities on the PROD row (line 1670 — ChangeTEMPSPROD)
    // VCUT: skipped — each component has its own TEMPSPROD row with quantities set by addVcutQty
    // (old software QuestionnaireSortie.cfc:708 — gated by PRODUIT_CODE NEQ "VCUT")
    if (!frontendIsVcut) {
      // Also update CNOMENCOP, INVENTAIRE_C on the PROD row
      await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .input("qteBonne", sql.Float, qteBonne)
        .input("qteDefect", sql.Float, qteDefect)
        .input("nopseq", sql.Int, nopseq)
        .input("inventaireC", sql.Int, tp.INVENTAIRE_C || 0)
        .query(`
          UPDATE TEMPSPROD SET
            TJQTEPROD = @qteBonne, TJQTEDEFECT = @qteDefect,
            CNOMENCOP = @nopseq, INVENTAIRE_C = @inventaireC
          WHERE TJSEQ = @tjseq
        `);

      // ── Point 3: TJPROD_TERMINE pre-check (mirrors old software lines 708-716)
      // Before ChangeTEMPSPROD, if remaining qty <= 0, mark PROD row as terminated
      try {
        const qteCheckResult = await pool.request()
          .input("transac", sql.Int, transac)
          .input("nopseq", sql.Int, nopseq)
          .query(`
            SELECT ISNULL(COP.NOPQTEAFAIRE, 0) AS NiQte_A_Fab,
                   ISNULL((SELECT SUM(TJQTEPROD) FROM TEMPSPROD WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq), 0) AS Qte_Termine
            FROM CNOMENCOP COP WHERE COP.NOPSEQ = @nopseq
          `);
        const qc = qteCheckResult.recordset[0];
        if (qc && (qc.NiQte_A_Fab - qc.Qte_Termine) <= 0) {
          await pool.request().input("tjseq", sql.Int, tjseq)
            .query(`UPDATE TEMPSPROD SET TJPROD_TERMINE = 1 WHERE TJSEQ = @tjseq`);
          console.log(`[submitQuestionnaire] TJPROD_TERMINE=1 pre-check: remaining <= 0`);
        }
      } catch (err) {
        console.warn("[submitQuestionnaire] TJPROD_TERMINE pre-check skipped:", err.message);
      }
    } else {
      console.log(`[submitQuestionnaire] VCUT: skipping quantity update + TJPROD_TERMINE pre-check (old software line 708)`);
    }

    // ── Point 2: ChangeTEMPSPROD (mirrors old software lines 1682-1741 exactly)
    // Old software calls ChangeTEMPSPROD(TJSEQ=LeTJSEQ, Statut=arguments.Statut)
    // VCUT operations SKIP this entirely (QuestionnaireSortie.cfc line 708-730)
    if (frontendIsVcut) {
      console.log(`[submitQuestionnaire] VCUT: skipping changeTEMPSPROD (matches old software line 708)`);
    } else
    try {
      const statusForQuery = isStop ? "STOP" : isComp ? "COMP" : "PROD";
      let copWhereChange = "";
      const diffReq = pool.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .input("statut", sql.VarChar(5), statusForQuery);
      if (copmachine && Number(copmachine) > 0) {
        diffReq.input("copmachine", sql.Int, Number(copmachine));
        copWhereChange = "AND cNOMENCOP_MACHINE = @copmachine";
      }
      const diffStatusResult = await diffReq.query(`
        SELECT TOP 1 TJSEQ, MODEPROD_MPCODE FROM TEMPSPROD
        WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
          ${copWhereChange}
          AND MODEPROD_MPCODE <> @statut
          AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
        ORDER BY TJSEQ DESC
      `);
      const diffTjseq = diffStatusResult.recordset[0]?.TJSEQ || null;
      if (diffTjseq) {
        // Update quantities on the found row (mirrors line 1696-1699)
        await pool.request()
          .input("tjseq", sql.Int, diffTjseq)
          .input("qteBonne", sql.Float, qteBonne)
          .input("qteDefect", sql.Float, qteDefect)
          .query(`UPDATE TEMPSPROD SET TJQTEPROD = @qteBonne, TJQTEDEFECT = @qteDefect WHERE TJSEQ = @tjseq`);
        // Recalculate costs on that row (mirrors line 1702-1712)
        await pool.request().input("tjseq", sql.Int, diffTjseq).query(`
          UPDATE TEMPSPROD SET
            TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0), TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
            TJEMCOUT = ISNULL(C.CALCEMCOUT, 0), TJOPCOUT = ISNULL(C.CALCOPCOUT, 0), TJMACOUT = ISNULL(C.CALCMACOUT, 0)
          FROM TEMPSPROD
          INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
          WHERE TEMPSPROD.TJSEQ = @tjseq
        `);
        console.log(`[submitQuestionnaire] ChangeTEMPSPROD: updated qty+costs on diffStatus row TJSEQ=${diffTjseq} (MPCODE=${diffStatusResult.recordset[0].MODEPROD_MPCODE})`);
      }
    } catch (err) {
      console.warn("[submitQuestionnaire] ChangeTEMPSPROD diff-status update skipped:", err.message);
    }

    // ── STEP 5: Insert DET_DEFECT records with all fields (Fix 2)
    // With write-as-you-go, defects are already in DB via addDefect.cfm.
    // Only insert if NOT already present (fallback for non-interactive submit).
    const existingDefectsResult = await pool.request()
      .input("tjseq", sql.Int, tjseq)
      .query(`SELECT COUNT(*) AS cnt FROM DET_DEFECT WHERE TEMPSPROD = @tjseq`);
    const defectsAlreadyInDb = (existingDefectsResult.recordset[0]?.cnt || 0) > 0;

    if (!defectsAlreadyInDb && defects && defects.length > 0) {
      // Get INVENTAIRE from the TRANSAC row
      const invResult = await pool.request()
        .input("transac", sql.Int, transac)
        .query(`SELECT INVENTAIRE FROM TRANSAC WHERE TRSEQ = @transac`);
      const inventaire = invResult.recordset[0]?.INVENTAIRE || 0;

      // Calculate cost estimates (mirrors old software)
      // CoutOperation = TJEMCOUT + TJOPCOUT + TJMACOUT from TEMPSPROD
      // CoutMatiere = SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac
      const defectCostResult = await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .input("transac", sql.Int, transac)
        .query(`
          SELECT ISNULL(TP.TJEMCOUT, 0) + ISNULL(TP.TJOPCOUT, 0) + ISNULL(TP.TJMACOUT, 0) AS CoutOperation,
                 ISNULL(TP.TJQTEPROD, 0) AS TJQTEPROD,
                 ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac), 0) AS CoutMatiere
          FROM TEMPSPROD TP WHERE TP.TJSEQ = @tjseq
        `);
      const defCosts = defectCostResult.recordset[0] || { CoutOperation: 0, CoutMatiere: 0, TJQTEPROD: 0 };
      const laValeurEstimeeTotale = defCosts.CoutOperation + defCosts.CoutMatiere;
      const laValeurEstimeeUnitaire = defCosts.TJQTEPROD !== 0
        ? laValeurEstimeeTotale / defCosts.TJQTEPROD
        : 0;

      for (const d of defects) {
        const dQty = Number(d.qty) || 0;
        if (dQty <= 0 || !d.typeId) continue;
        await pool.request()
          .input("tempsprod", sql.Int, tjseq)
          .input("transac", sql.Int, transac)
          .input("inventaire", sql.Int, inventaire)
          .input("machine", sql.Int, tp.MACHINE)
          .input("employe", sql.Int, employeeSeq)
          .input("raison", sql.Int, Number(d.typeId))
          .input("qty", sql.Float, dQty)
          .input("ddnote", sql.VarChar(500), d.notes || "")
          .input("costUnit", sql.Float, laValeurEstimeeUnitaire)
          .input("costTotal", sql.Float, laValeurEstimeeTotale)
          .query(`
            INSERT INTO DET_DEFECT
              (TEMPSPROD, TRANSAC, INVENTAIRE, MACHINE, EMPLOYE,
               DDQTEUNINV, DDDATE, RAISON, DDNOTE,
               DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TRANSAC_PERE)
            VALUES
              (@tempsprod, @transac, @inventaire, @machine, @employe,
               @qty, GETDATE(), @raison, @ddnote,
               @costUnit, @costTotal, 0)
          `);
      }
    }

    // ── STEP 5b: Create or reuse Sortie Materiel if quantities > 0
    // If ajouteSM was already called during the questionnaire (write-as-you-go),
    // the SM already exists on TEMPSPROD.SMNOTRANS and we just need to post it.
    // For VCUT: SM already exists from "+" button clicks, so always try to post.
    const totalQte = qteBonne + qteDefect;
    console.log(`[submitQuestionnaire] SM/EPF posting gate: totalQte=${totalQte} frontendIsVcut=${frontendIsVcut} frontendListeTjseq=${frontendListeTjseq} frontendListeEpfSeq=${frontendListeEpfSeq} frontendSmnotrans=${frontendSmnotrans}`);
    // VCUT: use MAX(TJQTEPROD/TJQTEDEFECT) from batch (SortieMateriel.cfc:1706-1718)
    let smTotalQte = totalQte;
    if (frontendIsVcut && frontendListeTjseq) {
      const vcutTjseqs = String(frontendListeTjseq).split(",").map(Number).filter(n => !isNaN(n));
      if (vcutTjseqs.length) {
        const vcutTotals = await pool.request().query(`
          SELECT MAX(ISNULL(TJQTEPROD,0)) AS TOTALQTEPROD, MAX(ISNULL(TJQTEDEFECT,0)) AS TOTALQTEDEFECT
          FROM TEMPSPROD WHERE TJSEQ IN (${vcutTjseqs.join(",")}) AND MODEPROD_MPCODE='PROD'`);
        smTotalQte = (vcutTotals.recordset[0]?.TOTALQTEPROD || 0) + (vcutTotals.recordset[0]?.TOTALQTEDEFECT || 0);
        console.log(`[submitQuestionnaire] VCUT smTotalQte=${smTotalQte} (MAX from batch ${vcutTjseqs.join(",")})`);
      }
    }
    let createdSmnotrans = ""; // tracks newly created smnotrans (empty if SM already existed)
    if (totalQte > 0 || frontendIsVcut) {
      try {
        if (frontendIsVcut) {
          // ── VCUT SM posting: SM was already created by ajouteSM calls during "+" clicks.
          // Old software (retireQuestionnaireSortie:774-828) only finds existing SM and REPORTs it.
          // It does NOT call Nba_Sp_Insert_Sortie_Materiel or Nba_Sp_Sortie_Materiel at submit.
          const existingSmResult = await pool.request()
            .input("transac", sql.Int, transac)
            .query(`
              SELECT DISTINCT LTRIM(RTRIM(SMNOTRANS)) AS SMNOTRANS
              FROM TEMPSPROD
              WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
              AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
            `);

          // Old software loops over each unique SMNOTRANS found (lines 784-801)
          console.log(`[submitQuestionnaire] VCUT SM: found ${existingSmResult.recordset.length} distinct SMNOTRANS rows`);
          for (const smRow of existingSmResult.recordset) {
            const smnotrans = (smRow.SMNOTRANS || "").trim();
            if (!smnotrans) continue;

            // Get SMSEQ from SORTIEMATERIEL (old software line 785-787)
            const smSeqResult = await pool.request()
              .input("smno", sql.VarChar(9), smnotrans.substring(0, 9))
              .query(`SELECT SMSEQ FROM SORTIEMATERIEL WHERE SMNOTRANS = @smno`);
            if (smSeqResult.recordset.length) {
              const theSmSeq = smSeqResult.recordset[0].SMSEQ;
              // Clarion date/time (support.cfc:871-873)
              const clarionSmResult = await pool.request().query(`
                SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
                       DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion`);
              const { LaDateClarion: smDateC, LaHeureClarion: smHeureC } = clarionSmResult.recordset[0];
              // Params: SmSeq;LaDateClarion;LaHeureClarion;'NomEmploye';'';'';'';'''';'''';'';'';'';''
              const smReportParams = `${theSmSeq};${smDateC};${smHeureC};'WebUI New';'';'';'';'''';'''';'';'';'';''`;
              console.log(`[submitQuestionnaire] VCUT SM REPORT params: ${smReportParams}`);
              const smReportResult = await callAutofab("EXECUTE_TRANSACTION", smReportParams, "SM", "REPORT");
              console.log(`[submitQuestionnaire] VCUT SM REPORT: SMSEQ=${theSmSeq} SMNOTRANS=${smnotrans} retval=${smReportResult.retval}`);
            }
          }
        } else {
          // ── Non-VCUT SM: create if needed, recalculate, then post
          // Get ConstruitDonneesLocales values needed for SM SPs
          const smDataResult = await pool.request()
            .input("transac", sql.Int, transac)
            .query(`
              SELECT T.TRITEM, T.TRNORELACHE, T.TRNOORIGINE,
                     C.CONOTRANS
              FROM TRANSAC T
              INNER JOIN COMMANDE C ON C.CONOTRANS = T.TRNO AND T.TRITEM > 0
              WHERE T.TRSEQ = @transac
            `);
          // Get NISTR_NIVEAU from VOperationParTransac
          const nistrResult = await pool.request()
            .input("transac", sql.Int, transac)
            .input("nopseq", sql.Int, nopseq)
            .query(`SELECT NISTR_NIVEAU, UtiliseInventaire FROM VOperationParTransac WHERE TRANSAC = @transac AND NOPSEQ = @nopseq`);

          const utiliseSM = nistrResult.recordset[0]?.UtiliseInventaire || 0;

          if (smDataResult.recordset.length && utiliseSM === 1) {
            const smData = smDataResult.recordset[0];
            const nistrNiveauRaw = nistrResult.recordset[0]?.NISTR_NIVEAU || "";
            const tritem = smData.TRITEM || 0;
            const conotrans = (smData.CONOTRANS || "").substring(0, 9);
            const trnorelache = smData.TRNORELACHE || 0;
            const smOperation = tp.OPERATION;
            const nistrNiveau = nistrNiveauRaw;

            // Check if SM already exists for this TJSEQ
            const existingSmResult = await pool.request()
              .input("tjseq", sql.Int, tjseq)
              .query(`SELECT SMNOTRANS FROM TEMPSPROD WHERE TJSEQ = @tjseq AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''`);

            let smnotrans = (existingSmResult.recordset[0]?.SMNOTRANS || "").trim();

            if (!smnotrans) {
              // Create new SM via Nba_Sp_Insert_Sortie_Materiel
              const insertSmReq = pool.request();
              insertSmReq.input("SMITEM", sql.Int, tritem);
              insertSmReq.input("SMNOORIGINE", sql.Char(9), conotrans);
              insertSmReq.input("DATE", sql.Char(10), dateNow);
              insertSmReq.input("HEURE", sql.Char(5), timeNow.substring(0, 5));
              insertSmReq.input("SMQTEPRODUIT", sql.Float, smTotalQte);
              insertSmReq.input("USER", sql.VarChar(30), "WebUI New");
              insertSmReq.input("SMNOSERIE", sql.VarChar(20), "");
              insertSmReq.input("SMNOTE", sql.VarChar(7500), "Ecran de production pour SM");
              insertSmReq.input("LOT_FAB", sql.Int, 0);
              insertSmReq.input("SMNORELACHE", sql.Int, 0);
              insertSmReq.output("NEWSMNOTRANS", sql.Char(9));
              insertSmReq.output("SQLERREUR", sql.Int);

              const insertSmResult = await insertSmReq.execute("Nba_Sp_Insert_Sortie_Materiel");
              smnotrans = (insertSmResult.output.NEWSMNOTRANS || "").trim();
              createdSmnotrans = smnotrans;
              console.log(`[submitQuestionnaire] Nba_Sp_Insert_Sortie_Materiel → SMNOTRANS=${smnotrans} err=${insertSmResult.output.SQLERREUR}`);
            }

            if (smnotrans) {
              // Call Nba_Sp_Sortie_Materiel to create DET_TRANS detail lines
              const smReq = pool.request();
              smReq.input("SMNOTRANS", sql.Char(9), smnotrans.substring(0, 9));
              smReq.input("SMITEM", sql.Int, tritem);
              smReq.input("SMNOORIGINE", sql.Char(9), conotrans);
              smReq.input("SMQTEPRODUIT", sql.Float, smTotalQte);
              smReq.input("OPERATION", sql.Int, smOperation);
              smReq.input("USER", sql.VarChar(30), "WebUI New");
              smReq.input("NISTR_NIVEAU", sql.VarChar(500), nistrNiveau);
              console.log(`[submitQuestionnaire] Nba_Sp_Sortie_Materiel: OPERATION=${smOperation} NISTR_NIVEAU=${nistrNiveau} SMQTEPRODUIT=${smTotalQte}`);
              smReq.input("NOSERIE", sql.VarChar(20), "");
              smReq.input("SMNORELACHE", sql.Int, trnorelache);
              smReq.output("SQLERREUR", sql.Int);
              const smResult = await smReq.execute("Nba_Sp_Sortie_Materiel");
              console.log(`[submitQuestionnaire] Nba_Sp_Sortie_Materiel → err=${smResult.output.SQLERREUR}`);

              // Link SM to TEMPSPROD
              await pool.request()
                .input("tjseq", sql.Int, tjseq)
                .input("smnotrans", sql.VarChar(9), smnotrans.substring(0, 9))
                .query(`UPDATE TEMPSPROD SET SMNOTRANS = @smnotrans WHERE TJSEQ = @tjseq AND MODEPROD_MPCODE = 'Prod'`);

              // Recalculate DET_TRANS quantities via BOM ratio (mirrors calculeQteSMQS)
              const detTransResult = await pool.request()
                .input("smnotrans", sql.VarChar(9), smnotrans.substring(0, 9))
                .query(`
                  SELECT DT.DTRSEQ, DT.TRANSAC, DT.ENTREPOT, DT.CONTENANT, DT.DTRQTE,
                         T.INVENTAIRE AS T_INVENTAIRE
                  FROM DET_TRANS DT
                  INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
                  WHERE DT.TRANSAC_TRNO = @smnotrans
                `);

              // Non-VCUT recalculation: NouvelleQte = ABS(totalQte * NIQTE)
              for (const dt of detTransResult.recordset) {
                const ratioResult = await pool.request()
                  .input("transac", sql.Int, transac)
                  .input("inventaire_c", sql.Int, tp.INVENTAIRE_C || 0)
                  .input("inventaire_m", sql.Int, dt.T_INVENTAIRE)
                  .query(`
                    SELECT MAX(CN.NIQTE) AS NIQTE
                    FROM cNOMENCOP COP
                    INNER JOIN cNOMENCLATURE CN ON CN.NISEQ_PERE = COP.CNOMENCLATURE
                    WHERE COP.TRANSAC = @transac
                      AND COP.INVENTAIRE_P = @inventaire_c
                      AND CN.INVENTAIRE_M = @inventaire_m
                  `);
                const niqte = ratioResult.recordset[0]?.NIQTE || 0;
                if (niqte <= 0) continue;

                const nouvelleQte = Math.abs(smTotalQte * niqte);

                const dtReq = pool.request();
                dtReq.input("TRSEQ", sql.Int, dt.TRANSAC);
                dtReq.input("INSEQ", sql.Int, dt.T_INVENTAIRE);
                dtReq.input("NSNO_SERIE", sql.VarChar(20), "");
                dtReq.input("ENSEQ", sql.Int, dt.ENTREPOT || 0);
                dtReq.input("DTRQTEUNINV", sql.Float, nouvelleQte);
                dtReq.input("TRFACTEURCONV", sql.Float, 1);
                dtReq.input("CONTENANT", sql.Int, dt.CONTENANT || 0);
                dtReq.input("UTILISATEUR", sql.VarChar(50), "WebUI New");
                dtReq.output("SQLERREUR", sql.Int);
                dtReq.output("ERROR", sql.Int);
                dtReq.output("DTRSEQ", sql.Int);
                await dtReq.execute("Nba_Insert_Det_Trans_Avec_Contenant");
              }

              // Report/Post the SM transaction via EXECUTE_TRANSACTION SM/REPORT
              const smSeqResult = await pool.request()
                .input("smno", sql.VarChar(9), smnotrans.substring(0, 9))
                .query(`SELECT SMSEQ FROM SORTIEMATERIEL WHERE SMNOTRANS = @smno`);
              if (smSeqResult.recordset.length) {
                const theSmSeq = smSeqResult.recordset[0].SMSEQ;
                const clarionSmResult = await pool.request().query(`
                  SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
                         DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion`);
                const { LaDateClarion: smDateC, LaHeureClarion: smHeureC } = clarionSmResult.recordset[0];
                const smReportParams = `${theSmSeq};${smDateC};${smHeureC};'WebUI New';'';'';'';'''';'''';'';'';'';''`;
                console.log(`[submitQuestionnaire] SM REPORT params: ${smReportParams}`);
                const smReportResult = await callAutofab("EXECUTE_TRANSACTION", smReportParams, "SM", "REPORT");
                console.log(`[submitQuestionnaire] SM REPORT: SMSEQ=${theSmSeq} retval=${smReportResult.retval}`);
              }

              console.log(`[submitQuestionnaire] SM creation + posting complete: ${smnotrans}, ${detTransResult.recordset.length} materials updated`);
            }
          }
        }
      } catch (err) {
        console.warn("[submitQuestionnaire] SM creation skipped:", err.message);
      }
    }

    // ── Point 4: Report Finished Products (mirrors old software lines 829-933)
    // Old software iterates over ListeEPFSEQ, for each:
    //   1. Gets TJSEQ from ListeTJSEQ at same index → looks up TEMPSPROD for NOPSEQ
    //   2. Looks up DET_TRANS by PFSEQ
    //   3. Updates DET_TRANS costs using component's NOPValeurEstime_Unitaire
    //   4. Reports via EXECUTE_TRANSACTION EPF/REPORT (AutoFab SOAP)
    //   5. For non-VCUT COMP: marks TJPROD_TERMINE=1
    try {
      console.log(`[submitQuestionnaire] EPF posting gate: frontendIsVcut=${frontendIsVcut} frontendListeEpfSeq="${frontendListeEpfSeq}" (truthy: ${!!frontendListeEpfSeq})`);
      if (frontendIsVcut && frontendListeEpfSeq) {
        // ── VCUT EPF posting: iterate over ListeEPFSEQ exactly like old software lines 829-933
        const epfSeqList = String(frontendListeEpfSeq).split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        console.log(`[submitQuestionnaire] VCUT EPF: epfSeqList=[${epfSeqList.join(",")}] (${epfSeqList.length} items)`);
        const tjseqList = frontendListeTjseq ? String(frontendListeTjseq).split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n)) : [];

        for (let i = 0; i < epfSeqList.length; i++) {
          const leEpfSeq = epfSeqList[i];
          // Get TJSEQ at same index (old software line 833-834), or fall back to query
          let leTjseq = tjseqList[i] || 0;
          if (!leTjseq) {
            const fallback = await pool.request()
              .input("transac", sql.Int, transac)
              .input("nopseq", sql.Int, nopseq)
              .query(`SELECT TOP 1 TJSEQ FROM TEMPSPROD WHERE TRANSAC = @transac AND cNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD' AND TJNOTE LIKE 'Ecran de production pour Temps prod%' ORDER BY TJSEQ DESC`);
            leTjseq = fallback.recordset[0]?.TJSEQ || 0;
          }

          // Get component NOPSEQ from TEMPSPROD (old software line 851-855)
          const trouveTJSEQ = await pool.request()
            .input("tjseq", sql.Int, leTjseq)
            .query(`SELECT TJSEQ, CNOMENCOP AS NOPSEQ, cNomencOp_Machine AS COPMACHINE, SMNOTRANS FROM TEMPSPROD WHERE TJSEQ = @tjseq`);
          const compNopseq = trouveTJSEQ.recordset[0]?.NOPSEQ || nopseq;

          // Get EPF DET_TRANS info (old software line 856-862)
          const trouveEPF = await pool.request()
            .input("pfseq", sql.Int, leEpfSeq)
            .query(`
              SELECT dt.DTRSEQ, epf.PFNOTRANS, dt.DTRQTE, t.TRSEQ AS EPF_TRSEQ
              FROM DET_TRANS dt
              INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
              INNER JOIN ENTRERPRODFINI epf ON t.TRNO = epf.PFNOTRANS
              WHERE epf.PFSEQ = @pfseq
            `);

          // Update DET_TRANS costs (old software lines 865-876)
          if (trouveEPF.recordset.length) {
            const epf = trouveEPF.recordset[0];
            const valResult = await pool.request()
              .input("compNopseq", sql.Int, compNopseq)
              .query(`SELECT NOPValeurEstime_Unitaire FROM CNOMENCOP WHERE NOPSEQ = @compNopseq`);
            const valUnit = valResult.recordset[0]?.NOPValeurEstime_Unitaire || 0;
            if (valUnit > 0 && epf.DTRSEQ) {
              await pool.request()
                .input("dtrseq", sql.Int, epf.DTRSEQ)
                .input("valUnit", sql.Float, valUnit)
                .query(`
                  UPDATE DET_TRANS SET
                    DTRCOUT_UNIT = dbo.FctNbaRound(@valUnit, 'PANB_DECIMAL_PRIX'),
                    DTRCOUT_TRANS = dbo.FctNbaRound(@valUnit * DTRQTE, 'PANB_DECIMAL_PRIX')
                  WHERE DTRSEQ = @dtrseq
                `);
            }

            // Report EPF via EXECUTE_TRANSACTION EPF/REPORT (old software: ReportEntreeProduitFini lines 2129-2139)
            // Uses PFSEQ (from ENTRERPRODFINI), NOT TRANSAC.TRSEQ
            const clarionEpfResult = await pool.request().query(`
              SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
                     DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion`);
            const { LaDateClarion: epfDateC, LaHeureClarion: epfHeureC } = clarionEpfResult.recordset[0];
            // Params: EPFSEQ;LaDateClarion;LaHeureClarion;'NomEmploye';'';'';'';'''';'''';'';'';'';''
            const epfReportParams = `${leEpfSeq};${epfDateC};${epfHeureC};'WebUI New';'';'';'';'''';'''';'';'';'';''`;
            console.log(`[submitQuestionnaire] VCUT EPF REPORT params: ${epfReportParams}`);
            const epfReportResult = await callAutofab("EXECUTE_TRANSACTION", epfReportParams, "EPF", "REPORT");
            console.log(`[submitQuestionnaire] VCUT EPF REPORT: PFSEQ=${leEpfSeq} retval=${epfReportResult.retval}`);
          }
          // VCUT: do NOT set TJPROD_TERMINE (old software line 918: skips for VCUT)
        }
      } else {
        // ── Non-VCUT EPF posting: original logic
        const epfResult = await pool.request()
          .input("transac", sql.Int, transac)
          .input("nopseq", sql.Int, nopseq)
          .query(`
            SELECT EPF.PFSEQ, EPF.PFNOTRANS, DT.DTRSEQ, DT.DTRQTE,
                   T.TRSEQ AS EPF_TRSEQ
            FROM ENTRERPRODFINI EPF
            INNER JOIN TRANSAC T ON T.TRNO = EPF.PFNOTRANS
            INNER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
            WHERE EPF.PFSEQ IN (
              SELECT DISTINCT EPF2.PFSEQ FROM ENTRERPRODFINI EPF2
              INNER JOIN TRANSAC T2 ON T2.TRNO = EPF2.PFNOTRANS
              WHERE T2.TRANSAC_PERE = @transac
            )
            AND ISNULL(EPF.PFPOSTER, 0) = 0
          `);
        for (const epf of epfResult.recordset) {
          const valResult = await pool.request()
            .input("nopseq", sql.Int, nopseq)
            .query(`SELECT NOPValeurEstime_Unitaire FROM CNOMENCOP WHERE NOPSEQ = @nopseq`);
          const valUnit = valResult.recordset[0]?.NOPValeurEstime_Unitaire || 0;
          if (valUnit > 0 && epf.DTRSEQ) {
            await pool.request()
              .input("dtrseq", sql.Int, epf.DTRSEQ)
              .input("valUnit", sql.Float, valUnit)
              .query(`
                UPDATE DET_TRANS SET
                  DTRCOUT_UNIT = dbo.FctNbaRound(@valUnit, 'PANB_DECIMAL_PRIX'),
                  DTRCOUT_TRANS = dbo.FctNbaRound(@valUnit * DTRQTE, 'PANB_DECIMAL_PRIX')
                WHERE DTRSEQ = @dtrseq
              `);
          }
          // Report EPF via EXECUTE_TRANSACTION EPF/REPORT (old software: ReportEntreeProduitFini)
          const clarionEpfResult2 = await pool.request().query(`
            SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
                   DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion`);
          const { LaDateClarion: epfDateC2, LaHeureClarion: epfHeureC2 } = clarionEpfResult2.recordset[0];
          const epfReportParams2 = `${epf.PFSEQ};${epfDateC2};${epfHeureC2};'WebUI New';'';'';'';'''';'''';'';'';'';''`;
          console.log(`[submitQuestionnaire] EPF REPORT params: ${epfReportParams2}`);
          const epfReportResult2 = await callAutofab("EXECUTE_TRANSACTION", epfReportParams2, "EPF", "REPORT");
          console.log(`[submitQuestionnaire] EPF REPORT: PFSEQ=${epf.PFSEQ} retval=${epfReportResult2.retval}`);
        }
      }
    } catch (err) {
      console.warn("[submitQuestionnaire] EPF report skipped:", err.message);
    }

    // ── Point 5: InsertTacheCariste — warehouse transfers for forklift
    // Mirrors old software InsertTacheCariste (lines 1932-2113)
    // When the next operation uses a different warehouse, creates TRANSFENTREP records
    // for the forklift operators to move material.
    try {
      const poolExt2 = await getPoolExt();
      // Find next operation for this work order (different NOPSEQ, ordered by date)
      const nextOpResult = await poolExt2.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .query(`
          SELECT TOP 1 ENTREPOT, INVENTAIRE_SEQ, MACHINE, COPMACHINE, NOPSEQ
          FROM vEcransProduction
          WHERE TRANSAC = @transac AND NOPSEQ <> @nopseq
          ORDER BY DATE_DEBUT_PREVU
        `);
      if (nextOpResult.recordset.length) {
        const nextOp = nextOpResult.recordset[0];
        // Get current operation's warehouse
        const curOpResult = await poolExt2.request()
          .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
          .query(`SELECT TOP 1 ENTREPOT, MACHINE, DECODE FROM vEcransProduction WHERE TRANSAC = @transac AND NOPSEQ = @nopseq`);
        const curOp = curOpResult.recordset[0];

        if (curOp && nextOp.ENTREPOT !== curOp.ENTREPOT) {
          // Warehouses differ → create forklift transfer tasks
          const srcWarehouse = curOp.ENTREPOT || 1;
          const dstWarehouse = nextOp.ENTREPOT || 1;

          // Find forklift department
          const forkResult = await pool.request()
            .query(`SELECT DESEQ FROM DEPARTEMENT WHERE DECODE = 'ForkLift'`);
          const forkWhaResult = await pool.request()
            .query(`SELECT DESEQ FROM DEPARTEMENT WHERE DECODE = 'ForkLift WHA'`);
          let forkDept = forkResult.recordset[0]?.DESEQ || 0;
          if (curOp.DECODE === "WHA" && forkWhaResult.recordset.length) {
            forkDept = forkWhaResult.recordset[0].DESEQ;
          }

          // Find containers from DET_TRANS for this order
          const contResult = await pool.request()
            .input("transac", sql.Int, transac)
            .query(`
              SELECT DISTINCT DT.CONTENANT, DT.CONTENANT_CON_NUMERO, DT.NO_SERIE,
                     T.INVENTAIRE, N.INVENTAIRE_INNOINV AS ITEM
              FROM DET_TRANS DT
              LEFT JOIN NO_SERIE N ON DT.NO_SERIE = N.NSSEQ
              INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
              WHERE T.TRANSAC = @transac
            `);

          // Get default production material status
          const stmResult = await pool.request()
            .query(`SELECT STM_SEQ FROM STATUT_MATERIEL WHERE STM_DEFAUT_PROD = 1`);
          const stmSeq = stmResult.recordset[0]?.STM_SEQ || 0;

          for (const cont of contResult.recordset) {
            // HPL/RECON items use general forklift
            if (cont.ITEM && (cont.ITEM.includes("HPL") || cont.ITEM.includes("RECON"))) {
              forkDept = forkResult.recordset[0]?.DESEQ || 0;
            }
            if (cont.CONTENANT && Number(cont.CONTENANT) > 0) {
              // With container: Nba_Insert_Transfer_Entrepot_Contenant
              const tReq = pool.request();
              tReq.input("CONTENANT_SOURCE", sql.Int, cont.CONTENANT);
              tReq.input("CONTENANT_DEST", sql.Int, cont.CONTENANT);
              tReq.input("ENTREPOT_SOURCE", sql.Int, srcWarehouse);
              tReq.input("ENTREPOT_DEST", sql.Int, dstWarehouse);
              tReq.input("STATUT_MATERIEL", sql.Int, stmSeq);
              tReq.input("UTILISATEUR", sql.VarChar(50), "WebUI New");
              tReq.input("MODE_VALIDATION", sql.Int, 0);
              tReq.input("LOT_FAB", sql.Int, 0);
              tReq.output("SQLERREUR", sql.Int);
              tReq.output("ERREUR", sql.Int);
              tReq.output("TRANSFENTREP", sql.Int);
              const tResult = await tReq.execute("Nba_Insert_Transfer_Entrepot_Contenant");
              const treseq = tResult.output.TRANSFENTREP || 0;
              if (treseq > 0) {
                await pool.request()
                  .input("treseq", sql.Int, treseq)
                  .input("copmachine", sql.Int, Number(copmachine) || 0)
                  .input("nopseq", sql.Int, nopseq)
                  .input("dept", sql.Int, forkDept)
                  .query(`UPDATE TRANSFENTREP SET TREPOSTER = 0, COPMACHINE = @copmachine, CNOMENCOP = @nopseq, DEPARTEMENT = @dept, TRENOTE = 'Ecran de production' WHERE TRESEQ = @treseq`);
              }
              console.log(`[submitQuestionnaire] Forklift transfer (container): TRESEQ=${treseq}`);
            } else if (cont.INVENTAIRE && cont.NO_SERIE) {
              // Without container: Nba_Insert_Transfer_Entrepot_Sans_Contenant
              const tReq = pool.request();
              tReq.input("INVENTAIRE", sql.Int, cont.INVENTAIRE);
              tReq.input("NO_SERIE", sql.Int, cont.NO_SERIE);
              tReq.input("QTE", sql.Float, 1);
              tReq.input("ENTREPOT_SOURCE", sql.Int, srcWarehouse);
              tReq.input("ENTREPOT_DEST", sql.Int, dstWarehouse);
              tReq.input("UTILISATEUR", sql.VarChar(50), "WebUI New");
              tReq.input("LOT_FAB", sql.Int, 0);
              tReq.output("SQLERREUR", sql.Int);
              tReq.output("ERREUR", sql.Int);
              tReq.output("TRANSFENTREP", sql.Int);
              const tResult = await tReq.execute("Nba_Insert_Transfer_Entrepot_Sans_Contenant");
              const treseq = tResult.output.TRANSFENTREP || 0;
              if (treseq > 0) {
                await pool.request()
                  .input("treseq", sql.Int, treseq)
                  .input("copmachine", sql.Int, Number(copmachine) || 0)
                  .input("nopseq", sql.Int, nopseq)
                  .input("dept", sql.Int, forkDept)
                  .query(`UPDATE TRANSFENTREP SET COPMACHINE = @copmachine, CNOMENCOP = @nopseq, DEPARTEMENT = @dept WHERE TRESEQ = @treseq`);
              }
              console.log(`[submitQuestionnaire] Forklift transfer (no container): TRESEQ=${treseq}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[submitQuestionnaire] InsertTacheCariste skipped:", err.message);
    }

    // ── STEP 6: Close PROD row via Nba_Sp_Update_Production (same SP as old software)
    // Get original start date/time from the PROD row
    // CRITICAL: mssql driver returns datetime as JS Date tagged UTC.
    // Must use getUTC*() to get the value as stored in SQL Server.
    const startDt = new Date(tp.TJDEBUTDATE);
    const startDateStr = `${startDt.getUTCFullYear()}-${String(startDt.getUTCMonth() + 1).padStart(2, "0")}-${String(startDt.getUTCDate()).padStart(2, "0")}`;
    const startTimeStr = `${String(startDt.getUTCHours()).padStart(2, "0")}:${String(startDt.getUTCMinutes()).padStart(2, "0")}:${String(startDt.getUTCSeconds()).padStart(2, "0")}`;

    // Fix 3: Use newly created smnotrans if available, otherwise fall back to original
    const smnotransForUpdate = createdSmnotrans || (tp.SMNOTRANS || "").trim();

    const updateReq = pool.request();
    updateReq.input("TJSEQ", sql.Int, tjseq);
    updateReq.input("EMPLOYE", sql.Int, employeeSeq);
    updateReq.input("OPERATION", sql.Int, tp.OPERATION);
    updateReq.input("MACHINE", sql.Int, tp.MACHINE);
    updateReq.input("TRSEQ", sql.Int, transac);
    updateReq.input("NO_SERIE", sql.Int, 0);
    updateReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
    updateReq.input("cNOMENCLATURE", sql.Int, tp.CNOMENCLATURE || 0);
    updateReq.input("INVENTAIRE_C", sql.Int, tp.INVENTAIRE_C || 0);
    updateReq.input("TJVALIDE", sql.Bit, 1);
    updateReq.input("TJPROD_TERMINE", sql.Bit, isComp ? 1 : 0);
    updateReq.input("TJQTEPROD", sql.Float, qteBonne);
    updateReq.input("TJQTEDEFECT", sql.Float, qteDefect);
    updateReq.input("StrDateD", sql.Char(10), startDateStr);
    updateReq.input("StrHeureD", sql.Char(8), startTimeStr);
    updateReq.input("StrDateF", sql.Char(10), dateNow);
    updateReq.input("StrHeureF", sql.Char(8), timeNow);
    updateReq.input("sModeProd", sql.VarChar(5), tp.MODEPROD_MPCODE.substring(0, 5));
    updateReq.input("TjNote", sql.VarChar(7500), "Ecran de production pour Temps prod New");
    updateReq.input("SMNOTRANS", sql.Char(9), smnotransForUpdate.substring(0, 9));
    updateReq.output("ERREUR", sql.Int);
    const updateResult = await updateReq.execute("Nba_Sp_Update_Production");
    console.log(`[submitQuestionnaire] Nba_Sp_Update_Production TJSEQ=${tjseq} SMNOTRANS=${smnotransForUpdate} err=${updateResult.output.ERREUR}`);

    // ── STEP 7: Recalculate costs on the PROD row via FctCalculTempsDeProduction
    try {
      await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .query(`
          UPDATE TEMPSPROD SET
            TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
            TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
            TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
            TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
            TJMACOUT = ISNULL(C.CALCMACOUT, 0)
          FROM TEMPSPROD
            INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
            WHERE TEMPSPROD.TJSEQ = @tjseq
          `);
    } catch (err) {
      console.warn("[submitQuestionnaire] FctCalculTempsDeProduction skipped:", err.message);
    }

    // ── Fix 7: Update TJVALEUR_MATIERE on TEMPSPROD (InsertEnCours)
    // Old software does FctCalculTempsDeProduction again for TJVALEUR_MATIERE
    try {
      await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .input("transac", sql.Int, transac)
        .query(`
          UPDATE TEMPSPROD SET
            TJVALEUR_MATIERE = ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac), 0)
          WHERE TJSEQ = @tjseq
        `);
      console.log(`[submitQuestionnaire] TJVALEUR_MATIERE updated on TJSEQ=${tjseq}`);
    } catch (err) {
      console.warn("[submitQuestionnaire] TJVALEUR_MATIERE update skipped:", err.message);
    }

    // ── Fix 7b: KPI insert — Nba_SP_Kpi_Insert_Valeur_Operation_Reel
    try {
      const kpiExistsResult = await pool.request()
        .input("nopseq", sql.Int, nopseq)
        .query(`SELECT COUNT(*) AS cnt FROM T_KPI_VALEUR_OPERATION_REEL WHERE CNOMENCOP = @nopseq`);
      const kpiExists = (kpiExistsResult.recordset[0]?.cnt || 0) > 0;
      if (!kpiExists) {
        const kpiReq = pool.request();
        kpiReq.input("NOPSEQ", sql.Int, nopseq);
        kpiReq.output("SQLERREUR", sql.Int);
        await kpiReq.execute("Nba_SP_Kpi_Insert_Valeur_Operation_Reel");
        console.log(`[submitQuestionnaire] Nba_SP_Kpi_Insert_Valeur_Operation_Reel called for NOPSEQ=${nopseq}`);
      }
    } catch (err) {
      console.warn("[submitQuestionnaire] KPI insert skipped:", err.message);
    }

    // ── STEP 8: Call Nba_Update_ProduitEnCours (line 982)
    // Needs material cost and operation cost from the updated TEMPSPROD row
    try {
      // CoutOperation from TEMPSPROD (TJEMCOUT+TJOPCOUT+TJMACOUT)
      // CoutMatiere from TRANSAC (SUM(0-TRCOUTTRANS)) — mirrors old software line 971-975
      const costResult = await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .input("transac2", sql.Int, transac)
        .query(`
          SELECT ISNULL(TP.TJEMCOUT, 0) + ISNULL(TP.TJOPCOUT, 0) + ISNULL(TP.TJMACOUT, 0) AS CoutOperation,
                 ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac2), 0) AS CoutMatiere
          FROM TEMPSPROD TP WHERE TP.TJSEQ = @tjseq
        `);
      const costs = costResult.recordset[0] || { CoutOperation: 0, CoutMatiere: 0 };

      const pecReq = pool.request();
      pecReq.input("TRANSAC", sql.Int, transac);
      pecReq.input("NOPSEQ", sql.Int, nopseq);
      pecReq.input("QteBon", sql.Float, qteBonne);
      pecReq.input("QteScrap", sql.Float, qteDefect);
      pecReq.input("CoutMatiere", sql.Float, costs.CoutMatiere);
      pecReq.input("CoutOperation", sql.Float, costs.CoutOperation);
      pecReq.output("SQLERREUR", sql.Int);
      pecReq.output("ERREUR", sql.Int);
      await pecReq.execute("Nba_Update_ProduitEnCours");
      console.log(`[submitQuestionnaire] Nba_Update_ProduitEnCours called`);
    } catch (err) {
      console.warn("[submitQuestionnaire] Nba_Update_ProduitEnCours skipped:", err.message);
    }

    // ── Fix 6: Update cNOMENCOP quantity totals from all PROD rows
    try {
      await pool.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .query(`
          UPDATE CNOMENCOP SET
            NOPQTETERMINE = (SELECT ISNULL(SUM(TJQTEPROD), 0) FROM TEMPSPROD WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'Prod'),
            NOPQTESCRAP = (SELECT ISNULL(SUM(TJQTEDEFECT), 0) FROM TEMPSPROD WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'Prod'),
            NOPQTERESTE = NOPQTEAFAIRE - (SELECT ISNULL(SUM(TJQTEPROD), 0) + ISNULL(SUM(TJQTEDEFECT), 0) FROM TEMPSPROD WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'Prod')
          WHERE NOPSEQ = @nopseq
        `);
      console.log(`[submitQuestionnaire] cNOMENCOP quantities updated for NOPSEQ=${nopseq}`);
    } catch (err) {
      console.warn("[submitQuestionnaire] cNOMENCOP quantity update skipped:", err.message);
    }

    // ── STEP 9: Mark operation as complete in PL_RESULTAT if COMP
    if (isComp) {
      await pool.request()
        .input("nopseq", sql.Int, nopseq)
        .query(`UPDATE PL_RESULTAT SET PR_TERMINE = 1 WHERE cNOMENCOP = @nopseq`);
    }

    // ── STEP 10: Auto-complete if STOP but total qty meets target (line 1130)
    if (isStop) {
      const totalResult = await pool.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .query(`
          SELECT ISNULL(SUM(TJQTEPROD), 0) AS TotalPROD
          FROM TEMPSPROD
          WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE IN ('Prod','STOP','COMP')
        `);
      const totalProd = totalResult.recordset[0]?.TotalPROD || 0;

      const poolExt = await getPoolExt();
      const targetResult = await poolExt.request()
        .input("transac", sql.Int, transac)
        .input("nopseq2", sql.Int, nopseq)
        .query(`SELECT TOP 1 v.QTE_A_FAB FROM vEcransProduction v WHERE v.TRANSAC = @transac AND v.NOPSEQ = @nopseq2`);
      const targetQty = targetResult.recordset[0]?.QTE_A_FAB || 0;

      if (targetQty > 0 && totalProd >= targetQty) {
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .query(`UPDATE TEMPSPROD SET TJPROD_TERMINE = 1 WHERE TJSEQ = @tjseq`);
        await pool.request()
          .input("nopseq", sql.Int, nopseq)
          .query(`UPDATE PL_RESULTAT SET PR_TERMINE = 1 WHERE cNOMENCOP = @nopseq`);
      }
    }

    res.json({
      success: true,
      data: { transac, type, tjseq, nopseq },
      message: `Questionnaire submitted — ${type.toUpperCase()} recorded`,
    });
  })
);

// ─── POST /ajouteSM.cfm ─────────────────────────────────────────────────────
// Mirrors legacy CF: SortieMateriel.cfc → ajouteSM (non-VCUT path)
// Called when user clicks OK on good quantity field.
// Creates or reuses a Sortie Matériel, then recalculates DET_TRANS quantities.
// Returns { smnotrans, smseq, materials[] } so the frontend can display the real SM data.
app.post(
  "/ajouteSM.cfm",
  handler(async (req, res) => {
    const { transac, copmachine, nopseq, tjseq, qteBonne, qteDefect, smnotrans: frontSmnotrans, listeTjseq, isVcut } = req.body;
    if (!transac || !nopseq) return res.json({ success: false, error: "transac and nopseq required" });

    const pool = await getPool();
    const goodQty = Number(qteBonne) || 0;

    // Find the PROD TEMPSPROD row for this operation
    // For VCUT: may need to search by any CNOMENCOP since addVcutQty updates it to the component's nopseq
    let prodResult = await pool.request()
      .input("transac", sql.Int, transac)
      .input("nopseq", sql.Int, nopseq)
      .query(`
        SELECT TOP 1 TJSEQ, SMNOTRANS, OPERATION, MACHINE, INVENTAIRE_C, CNOMENCLATURE, TJQTEDEFECT
        FROM TEMPSPROD
        WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD'
        ORDER BY TJSEQ DESC
      `);
    if (!prodResult.recordset.length && isVcut) {
      // VCUT fallback: find ANY PROD row for this TRANSAC
      prodResult = await pool.request()
        .input("transac", sql.Int, transac)
        .input("copmachine", sql.Int, copmachine || 0)
        .query(`
          SELECT TOP 1 TJSEQ, SMNOTRANS, OPERATION, MACHINE, INVENTAIRE_C, CNOMENCLATURE, TJQTEDEFECT
          FROM TEMPSPROD
          WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
          AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
          ${Number(copmachine) ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
          ORDER BY TJSEQ DESC
        `);
    }
    if (!prodResult.recordset.length) return res.json({ success: false, error: "No PROD row found" });
    const prodRow = prodResult.recordset[0];
    const prodTjseq = prodRow.TJSEQ;

    // Read CURRENT defect total from TEMPSPROD (already updated by addDefect/removeDefect)
    const defectQty = prodRow.TJQTEDEFECT || 0;

    // ─── VCUT PATH (SortieMateriel.cfc:1648-1836) ───────────────────────────
    // For VCUT, use MAX(TJQTEPROD) from the batch of TJSEQ and override operation/niveau
    let totalQte;
    let operationSeq;
    let nistrNiveauOverride;
    let leTjseqProd = prodTjseq;
    let tjseqList = [];

    if (isVcut) {
      // VCUT: find the right TJSEQ PROD (SortieMateriel.cfc:1651-1662)
      const vcutProdResult = await pool.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .query(`
          SELECT TOP 1 TJSEQ FROM TEMPSPROD
          WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD'
          ORDER BY TJSEQ DESC
        `);
      if (vcutProdResult.recordset.length) {
        leTjseqProd = vcutProdResult.recordset[0].TJSEQ;
      }

      // VCUT: compute listeTjseq server-side (avoids React state race condition)
      const allTjResult = await pool.request()
        .input("transac", sql.Int, transac)
        .input("copmachine", sql.Int, copmachine || 0)
        .query(`
          SELECT TJSEQ FROM TEMPSPROD
          WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
          AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
          ${Number(copmachine) ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
        `);
      tjseqList = allTjResult.recordset.map(r => r.TJSEQ);

      // VCUT: use MAX(TJQTEPROD/TJQTEDEFECT) from batch (SortieMateriel.cfc:1706-1718)
      if (tjseqList.length > 0) {
        const vcutTotals = await pool.request()
          .query(`
            SELECT MAX(ISNULL(TJQTEPROD, 0)) AS TOTALQTEPROD, MAX(ISNULL(TJQTEDEFECT, 0)) AS TOTALQTEDEFECT
            FROM TEMPSPROD
            WHERE TJSEQ IN (${tjseqList.join(",")}) AND MODEPROD_MPCODE = 'PROD'
          `);
        const vcutBonne = vcutTotals.recordset[0]?.TOTALQTEPROD || 0;
        const vcutDef = vcutTotals.recordset[0]?.TOTALQTEDEFECT || 0;
        totalQte = vcutBonne + vcutDef;
      } else {
        totalQte = goodQty + defectQty;
      }

      // VCUT overrides (ConstruitDonneesLocales:922-924)
      operationSeq = 1;
      nistrNiveauOverride = "00101";
      console.log(`[ajouteSM] VCUT path: leTjseqProd=${leTjseqProd} totalQte=${totalQte} tjseqList=${tjseqList.join(",")}`);
    } else {
      totalQte = goodQty + defectQty;
    }

    // Step 1: Update TEMPSPROD.TJQTEPROD on the PROD row (defect is already correct in DB)
    if (!isVcut) {
      await pool.request()
        .input("tjseq", sql.Int, prodTjseq)
        .input("good", sql.Float, goodQty)
        .query(`UPDATE TEMPSPROD SET TJQTEPROD = @good WHERE TJSEQ = @tjseq AND MODEPROD_MPCODE = 'PROD'`);
    }

    // Step 2: Determine if SM already exists
    let smnotrans = (frontSmnotrans || "").trim().substring(0, 9);

    // For VCUT, also check TEMPSPROD.SMNOTRANS on the PROD row (SortieMateriel.cfc:1666-1704)
    if (!smnotrans) {
      const smFromProd = await pool.request()
        .input("tjseq", sql.Int, leTjseqProd)
        .query(`
          SELECT TOP 1 SMNOTRANS FROM TEMPSPROD
          WHERE TJSEQ = @tjseq AND MODEPROD_MPCODE = 'PROD'
          AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
        `);
      if (smFromProd.recordset.length) {
        smnotrans = (smFromProd.recordset[0].SMNOTRANS || "").trim();
      }
    }

    // For VCUT, also check batch TJSEQ list (SortieMateriel.cfc:1690-1703)
    if (!smnotrans && isVcut && listeTjseq) {
      const tjseqList = String(listeTjseq).split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      if (tjseqList.length > 0) {
        const smFromBatch = await pool.request()
          .query(`
            SELECT TOP 1 SMNOTRANS FROM TEMPSPROD
            WHERE TJSEQ IN (${tjseqList.join(",")}) AND MODEPROD_MPCODE = 'PROD'
            AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
            ORDER BY TJSEQ DESC
          `);
        if (smFromBatch.recordset.length) {
          smnotrans = (smFromBatch.recordset[0].SMNOTRANS || "").trim();
        }
      }
    }

    // Verify the SM header exists in TRANSAC (orphan check)
    if (smnotrans) {
      const headerCheck = await pool.request()
        .input("smno", sql.VarChar(9), smnotrans)
        .query(`SELECT TOP 1 TRSEQ FROM TRANSAC WHERE TRNO = @smno`);
      if (!headerCheck.recordset.length) {
        // Orphan SM reference — clear it
        await pool.request()
          .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
          .input("smno", sql.VarChar(9), smnotrans)
          .query(`UPDATE TEMPSPROD SET SMNOTRANS = '' WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD' AND LEFT(SMNOTRANS,9) = @smno`);
        smnotrans = "";
      }
    }

    // Get ConstruitDonneesLocales values
    const smDataResult = await pool.request()
      .input("transac", sql.Int, transac)
      .query(`
        SELECT T.TRITEM, T.TRNORELACHE, C.CONOTRANS
        FROM TRANSAC T
        INNER JOIN COMMANDE C ON C.CONOTRANS = T.TRNO AND T.TRITEM > 0
        WHERE T.TRSEQ = @transac
      `);
    const nistrResult = await pool.request()
      .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
      .query(`SELECT NISTR_NIVEAU, UtiliseInventaire FROM VOperationParTransac WHERE TRANSAC = @transac AND NOPSEQ = @nopseq`);
    const utiliseSM = nistrResult.recordset[0]?.UtiliseInventaire || 0;
    console.log(`[ajouteSM] smDataResult.rows=${smDataResult.recordset.length} utiliseSM=${utiliseSM} isVcut=${isVcut} nopseq=${nopseq}`);
    // For VCUT, the old software ALWAYS creates SM (SortieMateriel.cfc:1648 checks PRODUIT_CODE=="VCUT", not UtiliseInventaire)
    if (!smDataResult.recordset.length || (utiliseSM !== 1 && !isVcut)) {
      console.log(`[ajouteSM] Skipping SM: smDataResult empty=${!smDataResult.recordset.length} utiliseSM=${utiliseSM}`);
      return res.json({ success: true, data: { smnotrans: "", materials: [] }, message: "No SM needed for this operation" });
    }
    const smData = smDataResult.recordset[0];
    const tritem = smData.TRITEM || 0;
    const conotrans = (smData.CONOTRANS || "").substring(0, 9);
    const trnorelache = smData.TRNORELACHE || 0;
    const nistrNiveau = nistrNiveauOverride || nistrResult.recordset[0]?.NISTR_NIVEAU || "";
    const effectiveOperation = operationSeq || prodRow.OPERATION;

    // Get server date/time
    const dtResult = await pool.request().query(`SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t`);
    const { d: dateNow, t: timeNow } = dtResult.recordset[0];

    let smseq = null;

    if (!smnotrans) {
      // Step 3a: Create NEW SM via Nba_Sp_Insert_Sortie_Materiel (SortieMateriel.cfc:2284-2294)
      // Use AutoFab SOAP API — exact same params as old software
      const insertParams = `${tritem},'${conotrans}','${dateNow}','${timeNow.substring(0, 5)}',${totalQte},'WebUI New','','Ecran de production pour SM',0,'0'`;
      console.log(`[ajouteSM] Nba_Sp_Insert_Sortie_Materiel params: ${insertParams}`);
      const insertResult = await callAutofab("EXECUTE_STORED_PROC", insertParams, "Nba_Sp_Insert_Sortie_Materiel", "0");
      smnotrans = String(insertResult.OutputValues?.NEWSMNOTRANS || "").trim();
      console.log(`[ajouteSM] Nba_Sp_Insert_Sortie_Materiel → ${smnotrans} err=${insertResult.OutputValues?.SQLERREUR}`);
    }

    if (smnotrans) {
      // Step 3b: Call Nba_Sp_Sortie_Materiel (SortieMateriel.cfc:2334-2344)
      // Use AutoFab SOAP API — exact same params as old software
      const smParams = `'${smnotrans.substring(0, 9)}',${tritem},'${conotrans}',${totalQte},${effectiveOperation},'WebUI New','${nistrNiveau}','',${trnorelache}`;
      console.log(`[ajouteSM] Nba_Sp_Sortie_Materiel params: ${smParams}`);
      const smResult = await callAutofab("EXECUTE_STORED_PROC", smParams, "Nba_Sp_Sortie_Materiel", "0");
      console.log(`[ajouteSM] Nba_Sp_Sortie_Materiel → err=${smResult.OutputValues?.SQLERREUR}`);

      // Step 4: Link SM to TEMPSPROD
      // For VCUT: propagate to ALL batch TJSEQ where SMNOTRANS is empty (SortieMateriel.cfc:1797-1813)
      if (isVcut) {
        // Use server-computed tjseqList (defined in VCUT path above)
        if (tjseqList.length > 0) {
          await pool.request()
            .input("smno", sql.VarChar(9), smnotrans)
            .query(`
              UPDATE TEMPSPROD SET SMNOTRANS = @smno
              WHERE TJSEQ IN (${tjseqList.join(",")})
              AND MODEPROD_MPCODE = 'PROD'
              AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') = ''
            `);
        }
      }
      // Always update the specific PROD TJSEQ
      await pool.request()
        .input("smno", sql.VarChar(9), smnotrans)
        .input("tjseq", sql.Int, leTjseqProd)
        .query(`UPDATE TEMPSPROD SET SMNOTRANS = @smno WHERE TJSEQ = @tjseq AND MODEPROD_MPCODE = 'PROD'`);

      // Step 5: Sync SORTIEMATERIEL and TRANSAC header with totalQte
      await pool.request()
        .input("smno", sql.VarChar(9), smnotrans).input("total", sql.Float, totalQte)
        .query(`UPDATE SORTIEMATERIEL SET SMQTEPRODUIT = @total WHERE LEFT(SMNOTRANS,9) = @smno`);
      await pool.request()
        .input("smno", sql.VarChar(9), smnotrans).input("total", sql.Float, totalQte)
        .query(`UPDATE TRANSAC SET TRQTETRANSAC = @total, TRQTEUNINV = @total WHERE TRNO = @smno`);

      // Get SMSEQ
      const smseqResult = await pool.request()
        .input("smno", sql.VarChar(9), smnotrans)
        .query(`SELECT TOP 1 SMSEQ FROM SORTIEMATERIEL WHERE LEFT(SMNOTRANS,9) = @smno`);
      smseq = smseqResult.recordset[0]?.SMSEQ || null;

      // Step 6: Recalculate DET_TRANS quantities (calculeQteSMQS logic)
      // Get all SM material lines
      const detResult = await pool.request()
        .input("smno", sql.VarChar(9), smnotrans)
        .query(`
          SELECT DT.DTRSEQ, DT.TRANSAC, DT.ENTREPOT, DT.CONTENANT, DT.DTRQTE,
                 T.INVENTAIRE AS T_INVENTAIRE, DT.TRANSAC_TRNO
          FROM DET_TRANS DT
          INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
          WHERE DT.TRANSAC_TRNO = @smno
        `);

      if (isVcut && listeTjseq) {
        // ── VCUT recalculation: exact replica of calculeQteSMQS lines 1081-1200
        // QTE_CIBLE = SUM(qty_per_component * NIQTE_ratio_per_component)
        const tjseqList = String(listeTjseq).split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));

        for (const dt of detResult.recordset) {
          // VCUT weighted sum query (old software lines 1081-1115)
          const qteCibleResult = await pool.request()
            .input("transac", sql.Int, transac)
            .input("materialInv", sql.Int, dt.T_INVENTAIRE)
            .input("smno", sql.VarChar(9), smnotrans)
            .query(`
              SELECT SUM(
                (ISNULL(TP.TJQTEPROD, 0) + ISNULL(TP.TJQTEDEFECT, 0))
                * ISNULL(RATIO.NIQTE, 0)
              ) AS QTE_CIBLE
              FROM TEMPSPROD TP
              INNER JOIN cNOMENCOP COP ON COP.TRANSAC = TP.TRANSAC AND COP.INVENTAIRE_P = TP.INVENTAIRE_C
              OUTER APPLY (
                SELECT MAX(CN.NIQTE) AS NIQTE
                FROM cNOMENCLATURE CN
                WHERE CN.NISEQ_PERE = COP.CNOMENCLATURE
                  AND CN.INVENTAIRE_M = @materialInv
              ) RATIO
              WHERE TP.TRANSAC = @transac
                AND TP.SMNOTRANS = @smno
                AND TP.TJSEQ IN (${tjseqList.join(",")})
                AND TP.MODEPROD_MPCODE = 'PROD'
            `);

          const nouvelleQte = qteCibleResult.recordset[0]?.QTE_CIBLE || 0;
          if (nouvelleQte <= 0) {
            console.log(`[ajouteSM] VCUT: skipping SM update for material ${dt.T_INVENTAIRE} (QTE_CIBLE=0, ratio not resolved)`);
            continue;
          }

          // Skip if quantity hasn't changed (old software line 1141)
          if (Math.abs((dt.DTRQTE || 0) - nouvelleQte) < 0.00001) {
            console.log(`[ajouteSM] VCUT: SM qty unchanged for material ${dt.T_INVENTAIRE} (${nouvelleQte})`);
            continue;
          }

          console.log(`[ajouteSM] VCUT: updating SM material ${dt.T_INVENTAIRE} from ${dt.DTRQTE} to ${nouvelleQte}`);

          // Update via Nba_Insert_Det_Trans_Avec_Contenant (old software lines 1169-1195)
          const dtReq = pool.request();
          dtReq.input("TRSEQ", sql.Int, dt.TRANSAC);
          dtReq.input("INSEQ", sql.Int, dt.T_INVENTAIRE);
          dtReq.input("NSNO_SERIE", sql.VarChar(20), "");
          dtReq.input("ENSEQ", sql.Int, dt.ENTREPOT || 0);
          dtReq.input("DTRQTEUNINV", sql.Float, nouvelleQte);
          dtReq.input("TRFACTEURCONV", sql.Float, 1);
          dtReq.input("CONTENANT", sql.Int, dt.CONTENANT || 0);
          dtReq.input("UTILISATEUR", sql.VarChar(50), "WebUI New");
          dtReq.output("SQLERREUR", sql.Int);
          dtReq.output("ERROR", sql.Int);
          dtReq.output("DTRSEQ", sql.Int);
          await dtReq.execute("Nba_Insert_Det_Trans_Avec_Contenant");
          // NOTE: SMQTEPRODUIT is already set to totalQte at line 2746 — do NOT overwrite per-material
        }
      } else {
        // ── Non-VCUT recalculation: simple totalQte * ratio
        const invC = prodRow.INVENTAIRE_C || 0;
        for (const dt of detResult.recordset) {
          const ratioResult = await pool.request()
            .input("transac", sql.Int, transac)
            .input("inventaireC", sql.Int, invC)
            .input("inventaireM", sql.Int, dt.T_INVENTAIRE)
            .query(`
              SELECT MAX(CN.NIQTE) AS NIQTE
              FROM cNOMENCOP COP
              INNER JOIN cNOMENCLATURE CN ON CN.NISEQ_PERE = COP.CNOMENCLATURE
              WHERE COP.TRANSAC = @transac AND COP.INVENTAIRE_P = @inventaireC AND CN.INVENTAIRE_M = @inventaireM
            `);
          const niqte = ratioResult.recordset[0]?.NIQTE || 0;
          if (niqte <= 0) continue;

          const nouvelleQte = Math.abs(totalQte * niqte);

          const dtReq = pool.request();
          dtReq.input("TRSEQ", sql.Int, dt.TRANSAC);
          dtReq.input("INSEQ", sql.Int, dt.T_INVENTAIRE);
          dtReq.input("NSNO_SERIE", sql.VarChar(20), "");
          dtReq.input("ENSEQ", sql.Int, dt.ENTREPOT || 0);
          dtReq.input("DTRQTEUNINV", sql.Float, nouvelleQte);
          dtReq.input("TRFACTEURCONV", sql.Float, 1);
          dtReq.input("CONTENANT", sql.Int, dt.CONTENANT || 0);
          dtReq.input("UTILISATEUR", sql.VarChar(50), "WebUI New");
          dtReq.output("SQLERREUR", sql.Int);
          dtReq.output("ERROR", sql.Int);
          dtReq.output("DTRSEQ", sql.Int);
          await dtReq.execute("Nba_Insert_Det_Trans_Avec_Contenant");

          await pool.request()
            .input("trseq", sql.Int, dt.TRANSAC).input("qty", sql.Float, nouvelleQte)
            .query(`UPDATE TRANSAC SET TRQTETRANSAC = @qty, TRQTEUNINV = @qty, TRQTECMD = @qty, TRQTEINV_ESTIME = @qty WHERE TRSEQ = @trseq`);
        }
      }
    }

    // Step 7: Fetch the real SM materials to return to frontend
    const materials = [];
    if (smnotrans) {
      const matResult = await pool.request()
        .input("smno", sql.VarChar(9), smnotrans)
        .query(`
          SELECT DT.DTRSEQ, DT.DTRQTE, DT.CONTENANT_CON_NUMERO,
                 DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
                 T.INVENTAIRE_INNOINV AS code,
                 T.INVENTAIRE_INDESC1 AS description_P, T.INVENTAIRE_INDESC2 AS description_S,
                 T.UNITE_INV_UNDESC1 AS unit_P, T.UNITE_INV_UNDESC2 AS unit_S,
                 ABS(DETTRANS.DTRQTE_TRANSACTION) AS correctedQty
          FROM DET_TRANS DT
          INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
          OUTER APPLY (
            SELECT DT.DTRQTE_INV + ISNULL((
              SELECT SUM(DTCOR.DTRQTE_INV) FROM DET_TRANS DTCOR
              INNER JOIN TRANSAC TR ON TR.TRSEQ = DTCOR.TRANSAC
              WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
            ), 0) DTRQTE_TRANSACTION
          ) DETTRANS
          WHERE DT.TRANSAC_TRNO = @smno
          ORDER BY T.INVENTAIRE_INNOINV
        `);
      for (const m of matResult.recordset) {
        materials.push({
          id: m.DTRSEQ,
          code: m.code,
          description_P: m.description_P, description_S: m.description_S,
          unit_P: m.unit_P, unit_S: m.unit_S,
          originalQty: m.DTRQTE,
          correctedQty: m.correctedQty || m.DTRQTE,
          warehouse_P: m.ENTREPOT_ENDESC_P, warehouse_S: m.ENTREPOT_ENDESC_S,
          container: m.CONTENANT_CON_NUMERO || "",
        });
      }
    }

    console.log(`[ajouteSM] Done: SM=${smnotrans} SMSEQ=${smseq} materials=${materials.length}`);
    res.json({
      success: true,
      data: { smnotrans, smseq, tjseq: prodTjseq, materials },
      message: smnotrans ? `SM ${smnotrans} updated with ${materials.length} materials` : "No SM created",
    });
  })
);

// ─── POST /addDefect.cfm ────────────────────────────────────────────────────
// Mirrors legacy CF: QteDefect.cfc → AjouteModifieDetailDEFECTQS (lines 743-847)
// Writes DET_DEFECT immediately, updates TEMPSPROD.TJQTEDEFECT. Returns updated totals.
app.post(
  "/addDefect.cfm",
  handler(async (req, res) => {
    const { transac, nopseq, qty, typeId, notes: ddnote } = req.body;
    if (!transac || !nopseq) return res.json({ success: false, error: "transac and nopseq required" });

    const pool = await getPool();
    const dQty = Number(qty) || 0;

    // Find latest PROD TEMPSPROD
    const prodResult = await pool.request()
      .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
      .query(`
        SELECT TOP 1 TJSEQ, MACHINE, EMPLOYE FROM TEMPSPROD
        WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD'
        ORDER BY TJSEQ DESC
      `);
    if (!prodResult.recordset.length) return res.json({ success: false, error: "No PROD row" });
    const prod = prodResult.recordset[0];

    // Get INVENTAIRE + cost estimates (mirrors old software)
    const costResult = await pool.request()
      .input("tjseq", sql.Int, prod.TJSEQ).input("transac", sql.Int, transac)
      .query(`
        SELECT T.INVENTAIRE,
               ISNULL(TP.TJEMCOUT,0)+ISNULL(TP.TJOPCOUT,0)+ISNULL(TP.TJMACOUT,0) AS CoutOp,
               ISNULL(TP.TJQTEPROD,0) AS TJQTEPROD,
               ISNULL((SELECT SUM(0-TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac),0) AS CoutMat
        FROM TEMPSPROD TP
        INNER JOIN TRANSAC T ON TP.TRANSAC = T.TRSEQ
        WHERE TP.TJSEQ = @tjseq
      `);
    const c = costResult.recordset[0] || {};
    const totalCost = (c.CoutOp || 0) + (c.CoutMat || 0);
    const unitCost = c.TJQTEPROD ? totalCost / c.TJQTEPROD : 0;

    let ddseq = null;
    if (dQty > 0 && typeId) {
      // INSERT DET_DEFECT
      const insResult = await pool.request()
        .input("tempsprod", sql.Int, prod.TJSEQ)
        .input("transac", sql.Int, transac)
        .input("inventaire", sql.Int, c.INVENTAIRE || 0)
        .input("machine", sql.Int, prod.MACHINE)
        .input("employe", sql.Int, prod.EMPLOYE)
        .input("qty", sql.Float, dQty)
        .input("raison", sql.Int, Number(typeId))
        .input("ddnote", sql.VarChar(1000), (ddnote || "").substring(0, 1000))
        .input("costUnit", sql.Float, unitCost)
        .input("costTotal", sql.Float, totalCost)
        .query(`
          INSERT INTO DET_DEFECT (TEMPSPROD, TRANSAC, INVENTAIRE, MACHINE, EMPLOYE,
            DDQTEUNINV, DDDATE, RAISON, DDNOTE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TRANSAC_PERE)
          VALUES (@tempsprod, @transac, @inventaire, @machine, @employe,
            @qty, GETDATE(), @raison, @ddnote, @costUnit, @costTotal, 0);
          SELECT SCOPE_IDENTITY() AS DDSEQ;
        `);
      ddseq = insResult.recordset[0]?.DDSEQ || null;
    }

    // Recalculate total defect qty
    const totalResult = await pool.request()
      .input("tjseq", sql.Int, prod.TJSEQ)
      .query(`SELECT ISNULL(SUM(DDQTEUNINV), 0) AS Total FROM DET_DEFECT WHERE TEMPSPROD = @tjseq`);
    const totalDefect = totalResult.recordset[0]?.Total || 0;

    // Update TEMPSPROD.TJQTEDEFECT
    await pool.request()
      .input("tjseq", sql.Int, prod.TJSEQ).input("defect", sql.Float, totalDefect)
      .query(`UPDATE TEMPSPROD SET TJQTEDEFECT = @defect WHERE TJSEQ = @tjseq`);

    // If SM exists, sync SORTIEMATERIEL quantity
    const tpResult = await pool.request()
      .input("tjseq", sql.Int, prod.TJSEQ)
      .query(`SELECT TJQTEPROD, TJQTEDEFECT, SMNOTRANS FROM TEMPSPROD WHERE TJSEQ = @tjseq`);
    const tp = tpResult.recordset[0] || {};
    if (tp.SMNOTRANS && tp.SMNOTRANS.trim()) {
      const smTotal = (tp.TJQTEPROD || 0) + totalDefect;
      await pool.request()
        .input("smno", sql.VarChar(9), tp.SMNOTRANS.trim().substring(0, 9))
        .input("total", sql.Float, smTotal)
        .query(`UPDATE SORTIEMATERIEL SET SMQTEPRODUIT = @total WHERE LEFT(SMNOTRANS,9) = @smno`);
    }

    // Fetch all defects for this TJSEQ to return to frontend
    const defectsResult = await pool.request()
      .input("tjseq", sql.Int, prod.TJSEQ)
      .query(`
        SELECT DD.DDSEQ, DD.DDQTEUNINV AS qty, DD.RAISON AS typeId, DD.DDNOTE AS notes,
               R.RRDESC_P AS type_P, R.RRDESC_S AS type_S
        FROM DET_DEFECT DD
        LEFT JOIN RAISON R ON DD.RAISON = R.RRSEQ
        WHERE DD.TEMPSPROD = @tjseq
        ORDER BY DD.DDSEQ
      `);

    console.log(`[addDefect] TJSEQ=${prod.TJSEQ} ddseq=${ddseq} totalDefect=${totalDefect}`);
    res.json({
      success: true,
      data: { ddseq, tjseq: prod.TJSEQ, totalDefect, smnotrans: (tp.SMNOTRANS || "").trim(), defects: defectsResult.recordset },
      message: "Defect recorded",
    });
  })
);

// ─── POST /removeDefect.cfm ─────────────────────────────────────────────────
// Mirrors legacy CF: QteDefect.cfc → retireDetailDEFECTQS (lines 569-612)
app.post(
  "/removeDefect.cfm",
  handler(async (req, res) => {
    const { ddseq } = req.body;
    if (!ddseq) return res.json({ success: false, error: "ddseq required" });

    const pool = await getPool();

    // Find the TEMPSPROD linked to this defect
    const linkResult = await pool.request()
      .input("ddseq", sql.Int, ddseq)
      .query(`SELECT TEMPSPROD FROM DET_DEFECT WHERE DDSEQ = @ddseq`);
    if (!linkResult.recordset.length) return res.json({ success: false, error: "Defect not found" });
    const tjseq = linkResult.recordset[0].TEMPSPROD;

    // Delete the defect
    await pool.request().input("ddseq", sql.Int, ddseq)
      .query(`DELETE FROM DET_DEFECT WHERE DDSEQ = @ddseq`);

    // Recalculate total
    const totalResult = await pool.request().input("tjseq", sql.Int, tjseq)
      .query(`SELECT ISNULL(SUM(DDQTEUNINV), 0) AS Total FROM DET_DEFECT WHERE TEMPSPROD = @tjseq`);
    const totalDefect = totalResult.recordset[0]?.Total || 0;

    // Update TEMPSPROD
    await pool.request().input("tjseq", sql.Int, tjseq).input("defect", sql.Float, totalDefect)
      .query(`UPDATE TEMPSPROD SET TJQTEDEFECT = @defect WHERE TJSEQ = @tjseq`);

    // Sync SM if exists
    const tpResult = await pool.request().input("tjseq", sql.Int, tjseq)
      .query(`SELECT TJQTEPROD, TJQTEDEFECT, SMNOTRANS FROM TEMPSPROD WHERE TJSEQ = @tjseq`);
    const tp = tpResult.recordset[0] || {};
    if (tp.SMNOTRANS && tp.SMNOTRANS.trim()) {
      const smTotal = (tp.TJQTEPROD || 0) + totalDefect;
      await pool.request()
        .input("smno", sql.VarChar(9), tp.SMNOTRANS.trim().substring(0, 9))
        .input("total", sql.Float, smTotal)
        .query(`UPDATE SORTIEMATERIEL SET SMQTEPRODUIT = @total WHERE LEFT(SMNOTRANS,9) = @smno`);
    }

    // Return updated defects list
    const defectsResult = await pool.request().input("tjseq", sql.Int, tjseq)
      .query(`
        SELECT DD.DDSEQ, DD.DDQTEUNINV AS qty, DD.RAISON AS typeId, DD.DDNOTE AS notes,
               R.RRDESC_P AS type_P, R.RRDESC_S AS type_S
        FROM DET_DEFECT DD LEFT JOIN RAISON R ON DD.RAISON = R.RRSEQ
        WHERE DD.TEMPSPROD = @tjseq ORDER BY DD.DDSEQ
      `);

    console.log(`[removeDefect] Deleted DDSEQ=${ddseq} totalDefect=${totalDefect}`);
    res.json({
      success: true,
      data: { tjseq, totalDefect, smnotrans: (tp.SMNOTRANS || "").trim(), defects: defectsResult.recordset },
      message: "Defect removed",
    });
  })
);

// ─── POST /cancelQuestionnaire.cfm ─────────────────────────────────────────
// Mirrors legacy CF: QuestionnaireSortie.cfc → retireQuestionnaireSortie (lines 314-597)
// Cleans up intermediate DB writes (DET_DEFECT, SM, TEMPSPROD quantities) when user cancels.
app.post(
  "/cancelQuestionnaire.cfm",
  handler(async (req, res) => {
    const { transac, nopseq, smnotrans, smseq } = req.body;
    if (!transac || !nopseq) return res.json({ success: false, error: "transac and nopseq required" });

    const pool = await getPool();

    // Find the PROD TEMPSPROD row
    const prodResult = await pool.request()
      .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
      .query(`
        SELECT TOP 1 TJSEQ, SMNOTRANS
        FROM TEMPSPROD WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND MODEPROD_MPCODE = 'PROD'
        ORDER BY TJSEQ DESC
      `);
    if (!prodResult.recordset.length) return res.json({ success: true, message: "Nothing to cancel" });
    const tjseq = prodResult.recordset[0].TJSEQ;
    const existingSmno = (smnotrans || prodResult.recordset[0].SMNOTRANS || "").trim().substring(0, 9);

    // Delete DET_DEFECT for this TJSEQ
    await pool.request().input("tjseq", sql.Int, tjseq)
      .query(`DELETE FROM DET_DEFECT WHERE TEMPSPROD = @tjseq`);

    // Delete SM if it was created during this questionnaire session
    if (existingSmno) {
      // Delete SM detail lines
      await pool.request().input("smno", sql.VarChar(9), existingSmno)
        .query(`DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = @smno`);
      // Delete SM header
      await pool.request().input("smno", sql.VarChar(9), existingSmno)
        .query(`DELETE FROM TRANSAC WHERE TRNO = @smno`);
      // Delete SORTIEMATERIEL
      await pool.request().input("smno", sql.VarChar(9), existingSmno)
        .query(`DELETE FROM SORTIEMATERIEL WHERE LEFT(SMNOTRANS,9) = @smno`);
      // Clear SMNOTRANS on TEMPSPROD
      await pool.request().input("smno", sql.VarChar(9), existingSmno)
        .input("transac", sql.Int, transac).input("nopseq", sql.Int, nopseq)
        .query(`UPDATE TEMPSPROD SET SMNOTRANS = '' WHERE SMNOTRANS = @smno AND TRANSAC = @transac AND CNOMENCOP = @nopseq`);
    }

    // Reset TEMPSPROD quantities
    await pool.request().input("tjseq", sql.Int, tjseq)
      .query(`UPDATE TEMPSPROD SET TJFINDATE = NULL, TJQTEPROD = 0, TJQTEDEFECT = 0, SMNOTRANS = '' WHERE TJSEQ = @tjseq`);

    console.log(`[cancelQuestionnaire] Cleaned up TJSEQ=${tjseq} SM=${existingSmno}`);
    res.json({ success: true, message: "Questionnaire cancelled, intermediate data cleaned up" });
  })
);

// ─── GET /getProductionTime.cfm ──────────────────────────────────────────────
// Returns production time entries for the Temps Production tab.
// Mirrors old CF: operation.cfc → afficheTempsProd()
// Main query against TEMPSPROD with MACHINE/DEPARTEMENT/INVENTAIRE joins.
app.get(
  "/getProductionTime.cfm",
  handler(async (req, res) => {
    const { startDate, endDate, department, machine, offset: rawOffset, limit: rawLimit } = req.query;

    if (!startDate) {
      return res.json({ success: false, error: "startDate is required" });
    }

    const PAGE_SIZE = 100;
    const offset = Math.max(0, parseInt(rawOffset) || 0);
    const limit = Math.min(500, Math.max(1, parseInt(rawLimit) || PAGE_SIZE));

    const pool = await getPool();

    // Build date range — endDate defaults to end of startDate if not provided
    const effectiveEndDate = endDate || startDate;

    // Build optional WHERE clauses for department/machine (server-side filtering)
    let extraWhere = "";
    const inputParams = [];
    inputParams.push({ name: "startDate", type: sql.VarChar(30), value: `${startDate} 00:00:00` });
    inputParams.push({ name: "endDate", type: sql.VarChar(30), value: `${effectiveEndDate} 23:59:59` });

    if (department) {
      const deptSeqs = String(department).split(",").map((d) => parseInt(d.trim())).filter((n) => !isNaN(n));
      if (deptSeqs.length > 0) {
        const deptParams = deptSeqs.map((seq, i) => {
          inputParams.push({ name: `dept${i}`, type: sql.Int, value: seq });
          return `@dept${i}`;
        });
        extraWhere += ` AND D.DESEQ IN (${deptParams.join(",")})`;
      }
    }
    if (machine) {
      const machSeqs = String(machine).split(",").map((m) => parseInt(m.trim())).filter((n) => !isNaN(n));
      if (machSeqs.length > 0) {
        const machParams = machSeqs.map((seq, i) => {
          inputParams.push({ name: `mach${i}`, type: sql.Int, value: seq });
          return `@mach${i}`;
        });
        extraWhere += ` AND M.MASEQ IN (${machParams.join(",")})`;
      }
    }

    const whereClause = `
      WHERE T.TJDEBUTDATE >= @startDate
        AND T.TJDEBUTDATE <= @endDate
        AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)
        ${extraWhere}`;

    const fromClause = `
      FROM TEMPSPROD T
      INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
      INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
      INNER JOIN PL_RESULTAT PL ON PL.TRANSAC = T.TRANSAC AND PL.CNOMENCOP = T.CNOMENCOP
      INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = T.CNOMENCOP
      LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
      LEFT OUTER JOIN TEMPSPRODEX TPE ON TPE.TEMPSPROD = T.TJSEQ`;

    // Run totals query and paginated data query in parallel
    const addParams = (req) => {
      for (const p of inputParams) req.input(p.name, p.type, p.value);
      return req;
    };

    const totalsReq = addParams(pool.request());
    const dataReq = addParams(pool.request());
    dataReq.input("offset", sql.Int, offset);
    dataReq.input("limit", sql.Int, limit);

    const [totalsResult, dataResult] = await Promise.all([
      // Only run totals on first page
      offset === 0
        ? totalsReq.query(`
            SELECT COUNT(DISTINCT T.TJSEQ) AS totalCount,
                   SUM(T.TJQTEPROD) AS totalQtyGood,
                   SUM(T.TJQTEDEFECT) AS totalQtyDefect
            ${fromClause}
            ${whereClause}`)
        : Promise.resolve(null),
      dataReq.query(`
        SELECT DISTINCT
          T.TJSEQ, T.MACHINE, T.MACHINE_MACODE, T.MACHINE_MADESC_P, T.MACHINE_MADESC_S,
          T.TRANSAC, T.OPERATION, T.OPERATION_OPCODE, T.OPERATION_OPDESC_P, T.OPERATION_OPDESC_S,
          T.EMPLOYE_EMNO, T.EMPLOYE_EMNOM, T.MODEPROD, T.MODEPROD_MPCODE, T.MODEPROD_MPDESC_P, T.MODEPROD_MPDESC_S,
          T.TJQTEPROD, T.TJQTEDEFECT, T.TRANSAC_TRNO, T.TRANSAC_TRITEM,
          T.SMNOTRANS, T.ENTRERPRODFINI_PFNOTRANS,
          T.TJDEBUTDATE, T.TJFINDATE, T.TJDUREE,
          T.cNomencOp_Machine AS COPMACHINE, T.CNOMENCOP,
          M.DEPARTEMENT, D.DEDESCRIPTION_S, D.DEDESCRIPTION_P, D.DECODE, M.MACODE,
          dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) AS NO_PROD,
          I.INDESC1, I.INDESC2, I.INNOINV,
          TPE.EXTPRD_NOTE AS PROD_NOTE
        ${fromClause}
        ${whereClause}
        ORDER BY T.TJDEBUTDATE DESC, T.TJFINDATE DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`),
    ]);

    // Map to frontend TimeEntry shape
    const fmtDate = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")} ${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
    };

    const data = dataResult.recordset.map((r) => ({
      TJSEQ: r.TJSEQ,
      TJDATE: fmtDate(r.TJDEBUTDATE),
      TJDEBUT: fmtDate(r.TJDEBUTDATE),
      TJFIN: fmtDate(r.TJFINDATE),
      TJDUREE: (() => {
        const raw = String(r.TJDUREE || "0:00").trim();
        const [h, m] = raw.split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      })(),
      STATUT_CODE: r.MODEPROD || 0,
      STATUT_P: r.MODEPROD_MPDESC_P || "",
      STATUT_S: r.MODEPROD_MPDESC_S || "",
      MODEPROD_MPCODE: r.MODEPROD_MPCODE || "",
      TRANSAC: r.TRANSAC,
      NO_PROD: r.NO_PROD || `${r.TRANSAC_TRNO}-${String(r.TRANSAC_TRITEM).padStart(3, "0")}`,
      NOM_CLIENT: "",
      COPMACHINE: r.COPMACHINE || 0,
      OPERATION_P: r.OPERATION_OPDESC_P || "",
      OPERATION_S: r.OPERATION_OPDESC_S || "",
      DEPARTEMENT: r.DEPARTEMENT,
      DECODE: r.DECODE || "",
      MACHINE: r.MACHINE,
      MACODE: r.MACODE || "",
      MACHINE_P: r.MACHINE_MADESC_P || "",
      MACHINE_S: r.MACHINE_MADESC_S || "",
      EMNO: r.EMPLOYE_EMNO || "",
      EMNOM: r.EMPLOYE_EMNOM || "",
      EMNOIDENT: 0,
      QTE_BONNE: r.TJQTEPROD || 0,
      QTE_DEFAUT: r.TJQTEDEFECT || 0,
      SM_EPF: [r.SMNOTRANS, r.ENTRERPRODFINI_PFNOTRANS].filter(Boolean).join(" / "),
      INNOINV: r.INNOINV || "",
      INDESC1: r.INDESC1 || "",
      INDESC2: r.INDESC2 || "",
      PROD_NOTE: r.PROD_NOTE || "",
    }));

    const hasMore = data.length === limit;
    const totals = totalsResult
      ? {
          totalCount: totalsResult.recordset[0].totalCount,
          totalQtyGood: totalsResult.recordset[0].totalQtyGood || 0,
          totalQtyDefect: totalsResult.recordset[0].totalQtyDefect || 0,
        }
      : undefined;

    res.json({
      success: true,
      data,
      hasMore,
      totals,
      message: `Retrieved ${data.length} entries (offset ${offset})`,
    });
  })
);

// ─── POST /updateTimeStatus.cfm ─────────────────────────────────────────────
// Updates the status (MODEPROD) of a TEMPSPROD entry.
// Mirrors old CF: operation.cfc → ModifieStatutTempsProd()
app.post(
  "/updateTimeStatus.cfm",
  handler(async (req, res) => {
    const { tjseq, statusCode } = req.body;

    if (!tjseq || statusCode == null) {
      return res.json({ success: false, error: "tjseq and statusCode are required" });
    }

    const pool = await getPool();

    // The frontend sends MODEPROD (MPSEQ) as statusCode.
    // Look up the MODEPROD record to get MPCODE and descriptions.
    const modeprod = await pool.request()
      .input("mpseq", sql.Int, statusCode)
      .query(`
        SELECT MPSEQ, MPCODE, MPDESC_P, MPDESC_S
        FROM MODEPROD
        WHERE MPSEQ = @mpseq
      `);

    if (!modeprod.recordset.length) {
      return res.json({ success: false, error: `MODEPROD not found for MPSEQ=${statusCode}` });
    }

    const mp = modeprod.recordset[0];

    await pool.request()
      .input("tjseq", sql.Int, tjseq)
      .input("modeprod", sql.Int, mp.MPSEQ)
      .input("mpcode", sql.VarChar(5), mp.MPCODE)
      .input("mpdesc_p", sql.VarChar(50), mp.MPDESC_P)
      .input("mpdesc_s", sql.VarChar(50), mp.MPDESC_S)
      .query(`
        UPDATE TEMPSPROD
        SET MODEPROD = @modeprod,
            MODEPROD_MPCODE = @mpcode,
            MODEPROD_MPDESC_P = @mpdesc_p,
            MODEPROD_MPDESC_S = @mpdesc_s
        WHERE TJSEQ = @tjseq
      `);

    res.json({
      success: true,
      data: { TJSEQ: tjseq },
      message: "Status updated",
    });
  })
);

// ─── POST /submitSetupQuestionnaire.cfm ──────────────────────────────────────
// Mirrors legacy CF: QuestionnaireSortie.cfc → ModifieSETUP (lines 2642-2711)
// Saves stop cause data to TEMPSPRODEX on the most recent SETUP TEMPSPROD row.
app.post(
  "/submitSetupQuestionnaire.cfm",
  handler(async (req, res) => {
    const { transac, copmachine, primaryCause, secondaryCause, notes } = req.body;

    if (!transac) {
      return res.json({ success: false, error: "transac is required" });
    }

    const pool = await getPool();

    // Find the most recent SETUP TEMPSPROD row (mirrors legacy trouveDernierSetUp)
    const tpReq = pool.request().input("transac", sql.Int, transac);
    let copWhere = "";
    if (copmachine && Number(copmachine) > 0) {
      tpReq.input("copmachine", sql.Int, Number(copmachine));
      copWhere = "AND cNomencOp_Machine = @copmachine";
    }
    const tpResult = await tpReq.query(`
      SELECT TOP 1 TJSEQ
      FROM TEMPSPROD
      WHERE TRANSAC = @transac
        AND MODEPROD_MPCODE = 'Setup'
        AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
        ${copWhere}
      ORDER BY TJSEQ DESC
    `);

    if (!tpResult.recordset.length) {
      return res.json({ success: false, error: "No SETUP TEMPSPROD record found" });
    }

    const tjseq = tpResult.recordset[0].TJSEQ;
    const causeP = Number(primaryCause) || 0;
    const causeS = Number(secondaryCause) || 0;
    const noteText = (notes || "").substring(0, 500);

    if (causeP > 0) {
      // Check if TEMPSPRODEX record exists
      const existsResult = await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .query(`SELECT TEMPSPROD FROM TEMPSPRODEX WHERE TEMPSPROD = @tjseq`);

      if (existsResult.recordset.length) {
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .input("causeP", sql.Int, causeP)
          .input("causeS", sql.Int, causeS)
          .input("note", sql.VarChar(500), noteText)
          .query(`
            UPDATE TEMPSPRODEX
            SET QA_CAUSEP = @causeP, QA_CAUSES = @causeS, EXTPRD_NOTE = @note
            WHERE TEMPSPROD = @tjseq
          `);
      } else {
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .input("causeP", sql.Int, causeP)
          .input("causeS", sql.Int, causeS)
          .input("note", sql.VarChar(500), noteText)
          .query(`
            INSERT INTO TEMPSPRODEX (TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE)
            VALUES (@tjseq, @causeP, @causeS, @note)
          `);
      }
    }

    console.log(`[submitSetupQuestionnaire] TJSEQ=${tjseq} causeP=${causeP} causeS=${causeS}`);

    res.json({
      success: true,
      data: { tjseq },
      message: "Setup questionnaire saved",
    });
  })
);

// ─── POST /changeStatus.cfm ─────────────────────────────────────────────────
// Mirrors legacy CF: QuestionnaireSortie.cfc → ajouteModifieStatut (lines 1295-1635)
// Uses the same stored procedures (Nba_Sp_Insert_Production / Nba_Sp_Update_Production)
// to close the current TEMPSPROD row and open a new one for the new status.
// For STOP/COMP, the frontend navigates to the questionnaire screen where the
// actual DB updates (quantities, defects, etc.) happen via submitQuestionnaire.cfm.
app.post(
  "/changeStatus.cfm",
  handler(async (req, res) => {
    const { transac, copmachine, newStatus, employeeCode } = req.body;

    if (!transac || !newStatus) {
      return res.json({ success: false, error: "transac and newStatus are required" });
    }

    // All statuses go through the same SP flow: close previous row + insert new row.
    // For STOP/COMP, the frontend then navigates to the questionnaire screen.
    const modeprodMap = { SETUP: "Setup", PROD: "Prod", PAUSE: "PAUSE", ON_HOLD: "HOLD", READY: "READY", STOP: "STOP", COMP: "COMP" };
    const mpcode = modeprodMap[newStatus];
    if (!mpcode) {
      return res.json({ success: false, error: `Unknown status: ${newStatus}` });
    }

    const pool = await getPool();

    // Use SQL GETDATE() for server time consistency (mirrors old CF DateFormat/TimeFormat(Now()))
    const dtResult = await pool.request().query(`SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t`);
    const dateStr = dtResult.recordset[0].d;
    const timeStr = dtResult.recordset[0].t;

    // 1. Look up MODEPROD record for the new status
    const mpResult = await pool.request()
      .input("mpcode", sql.VarChar(10), mpcode)
      .query(`SELECT MPSEQ, MPCODE FROM MODEPROD WHERE MPCODE = @mpcode`);

    if (!mpResult.recordset.length) {
      return res.json({ success: false, error: `MODEPROD not found for code ${mpcode}` });
    }
    const mp = mpResult.recordset[0];

    // 2. Get operation details (OPERATION, MACHINE, INVENTAIRE, CNOMENCLATURE, NOPSEQ)
    const poolExt = await getPoolExt();
    const opReq = poolExt.request().input("transac", sql.Int, transac);
    let opWhere = `WHERE v.TRANSAC = @transac AND v.OPERATION <> 'FINSH'`;
    if (copmachine) {
      opReq.input("copmachine", sql.Int, copmachine);
      opWhere += ` AND v.COPMACHINE = @copmachine`;
    }
    const opResult = await opReq.query(`
      SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.CNOMENCLATURE, v.NOPSEQ, v.COPMACHINE,
             v.TAUXHORAIREOPERATION, v.NO_INVENTAIRE, v.PRODUIT_CODE
      FROM vEcransProduction v
      ${opWhere}
    `);

    if (!opResult.recordset.length) {
      return res.json({ success: false, error: `Operation not found for transac=${transac}` });
    }
    const op = opResult.recordset[0];

    // 3. Employee — frontend sends EMSEQ directly
    const employeeSeq = Number(employeeCode) || 0;

    // 4. Find the most recent TEMPSPROD row with a DIFFERENT status
    //    (mirrors legacy trouveDernierStatut query)
    const tpReq = pool.request()
      .input("transac2", sql.Int, transac)
      .input("newMpcode", sql.VarChar(10), mpcode)
      .input("nopseq2", sql.Int, op.NOPSEQ);
    let tpWhere = `WHERE TRANSAC = @transac2 AND CNOMENCOP = @nopseq2
      AND MODEPROD_MPCODE <> @newMpcode
      AND TJNOTE LIKE 'Ecran de production pour Temps prod%'`;
    if (copmachine) {
      tpReq.input("copmachine2", sql.Int, copmachine);
      tpWhere += ` AND cNomencOp_Machine = @copmachine2`;
    }
    const tpResult = await tpReq.query(`
      SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
             CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
             TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
      FROM TEMPSPROD
      ${tpWhere}
      ORDER BY TJSEQ DESC
    `);

    const tjNote = "Ecran de production pour Temps prod New";

    // ── Path A (mirrors old software lines 1350-1432):
    // If NO previous row exists and status is NOT SETUP, create a PROD row first.
    // The old software does this so there's always a PROD row to close.
    if (tpResult.recordset.length === 0 && mpcode !== "Setup") {
      const prodMpResult = await pool.request().query(`SELECT MPSEQ FROM MODEPROD WHERE MPCODE = 'Prod'`);
      if (prodMpResult.recordset.length) {
        const prodMpSeq = prodMpResult.recordset[0].MPSEQ;
        const pathAReq = pool.request();
        pathAReq.input("EMPLOYE", sql.Int, employeeSeq);
        pathAReq.input("EMPLOYE_TAUXH", sql.Float, 0);
        pathAReq.input("OPERATION", sql.Int, op.OPERATION_SEQ);
        pathAReq.input("OPERATION_TAUXH", sql.Float, 0);
        pathAReq.input("MACHINE", sql.Int, op.MACHINE);
        pathAReq.input("MACHINE_TAUXH", sql.Float, 0);
        pathAReq.input("TRSEQ", sql.Int, transac);
        pathAReq.input("NO_SERIE", sql.Int, 0);
        pathAReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
        pathAReq.input("cNOMENCLATURE", sql.Int, op.CNOMENCLATURE || 0);
        pathAReq.input("INVENTAIRE_C", sql.Int, op.INVENTAIRE_SEQ || 0);
        pathAReq.input("TJQTEPROD", sql.Float, 0);
        pathAReq.input("TJQTEDEFECT", sql.Float, 0);
        pathAReq.input("TJVALIDE", sql.Bit, 1);
        pathAReq.input("TJPROD_TERMINE", sql.Bit, 0);
        pathAReq.input("StrDateD", sql.Char(10), dateStr);
        pathAReq.input("StrHeureD", sql.Char(8), timeStr);
        pathAReq.input("StrDateF", sql.Char(10), "");
        pathAReq.input("StrHeureF", sql.Char(8), "");
        pathAReq.input("MODEPROD", sql.Int, prodMpSeq);
        pathAReq.input("TjNote", sql.VarChar(7500), tjNote);
        pathAReq.input("LOT_FAB", sql.Int, 0);
        pathAReq.input("SMNOTRANS", sql.Char(9), "");
        pathAReq.input("CNOMENCOP_MACHINE", sql.Int, copmachine || op.COPMACHINE || 0);
        pathAReq.output("TJSEQ", sql.Int);
        pathAReq.output("ERREUR", sql.Int);
        await pathAReq.execute("Nba_Sp_Insert_Production");
        const pathATjseq = pathAReq.parameters.TJSEQ?.value;
        console.log(`[changeStatus] Path A: created initial PROD row TJSEQ=${pathATjseq}`);

        // Re-query to find the row we just created as "previous"
        const reQuery = pool.request()
          .input("trx", sql.Int, transac)
          .input("mpc", sql.VarChar(10), mpcode)
          .input("nop", sql.Int, op.NOPSEQ);
        let reWhere = `WHERE TRANSAC = @trx AND CNOMENCOP = @nop AND MODEPROD_MPCODE <> @mpc AND TJNOTE LIKE 'Ecran de production pour Temps prod%'`;
        if (copmachine) {
          reQuery.input("cpm", sql.Int, copmachine);
          reWhere += ` AND cNomencOp_Machine = @cpm`;
        }
        const reResult = await reQuery.query(`
          SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
                 CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
                 TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
          FROM TEMPSPROD ${reWhere} ORDER BY TJSEQ DESC
        `);
        // Push into tpResult.recordset so the close step below finds it
        if (reResult.recordset.length) {
          tpResult.recordset.push(reResult.recordset[0]);
        }
      }
    }

    if (tpResult.recordset.length > 0) {
      // --- EXISTING ROW FOUND: close it with Nba_Sp_Update_Production, then insert new ---
      const prev = tpResult.recordset[0];
      // CRITICAL: mssql driver returns datetime as JS Date tagged UTC.
      // Must use getUTC*() to get the value as stored in SQL Server.
      const prevDate = new Date(prev.TJDEBUTDATE);
      const prevDateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}-${String(prevDate.getUTCDate()).padStart(2, "0")}`;
      const prevTimeStr = `${String(prevDate.getUTCHours()).padStart(2, "0")}:${String(prevDate.getUTCMinutes()).padStart(2, "0")}:${String(prevDate.getUTCSeconds()).padStart(2, "0")}`;

      // Close previous row — param names must match SP signature exactly
      const updateReq = pool.request();
      updateReq.input("TJSEQ", sql.Int, prev.TJSEQ);
      updateReq.input("EMPLOYE", sql.Int, prev.EMPLOYE);
      updateReq.input("OPERATION", sql.Int, op.OPERATION_SEQ);
      updateReq.input("MACHINE", sql.Int, op.MACHINE);
      updateReq.input("TRSEQ", sql.Int, transac);
      updateReq.input("NO_SERIE", sql.Int, 0);
      updateReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
      updateReq.input("cNOMENCLATURE", sql.Int, prev.cNOMENCLATURE || 0);
      updateReq.input("INVENTAIRE_C", sql.Int, op.INVENTAIRE_SEQ || 0);
      updateReq.input("TJVALIDE", sql.Bit, 1);
      updateReq.input("TJPROD_TERMINE", sql.Bit, 0);
      updateReq.input("TJQTEPROD", sql.Float, prev.TJQTEPROD || 0);
      updateReq.input("TJQTEDEFECT", sql.Float, prev.TJQTEDEFECT || 0);
      updateReq.input("StrDateD", sql.Char(10), prevDateStr);
      updateReq.input("StrHeureD", sql.Char(8), prevTimeStr);
      updateReq.input("StrDateF", sql.Char(10), dateStr);
      updateReq.input("StrHeureF", sql.Char(8), timeStr);
      updateReq.input("sModeProd", sql.VarChar(5), prev.MODEPROD_MPCODE);
      updateReq.input("TjNote", sql.VarChar(7500), tjNote);
      updateReq.input("SMNOTRANS", sql.Char(9), prev.SMNOTRANS || "");
      updateReq.output("ERREUR", sql.Int);
      await updateReq.execute("Nba_Sp_Update_Production");
      console.log(`[changeStatus] Closed TEMPSPROD TJSEQ=${prev.TJSEQ} (was ${prev.MODEPROD_MPCODE})`);
    }

    // --- INSERT new TEMPSPROD row for the new status ---
    // Param names must match SP signature exactly
    const insertReq = pool.request();
    insertReq.input("EMPLOYE", sql.Int, employeeSeq);
    insertReq.input("EMPLOYE_TAUXH", sql.Float, 0);
    insertReq.input("OPERATION", sql.Int, op.OPERATION_SEQ);
    insertReq.input("OPERATION_TAUXH", sql.Float, 0); // Old software always passes 0
    insertReq.input("MACHINE", sql.Int, op.MACHINE);
    insertReq.input("MACHINE_TAUXH", sql.Float, 0);
    insertReq.input("TRSEQ", sql.Int, transac);
    insertReq.input("NO_SERIE", sql.Int, 0);
    insertReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
    insertReq.input("cNOMENCLATURE", sql.Int, op.CNOMENCLATURE || 0);
    insertReq.input("INVENTAIRE_C", sql.Int, op.INVENTAIRE_SEQ || 0);
    insertReq.input("TJQTEPROD", sql.Float, 0);
    insertReq.input("TJQTEDEFECT", sql.Float, 0);
    insertReq.input("TJVALIDE", sql.Bit, 1);
    insertReq.input("TJPROD_TERMINE", sql.Bit, 0);
    insertReq.input("StrDateD", sql.Char(10), dateStr);
    insertReq.input("StrHeureD", sql.Char(8), timeStr);
    // Old software: COMP rows are immediately "closed" with end date/time = NOW
    insertReq.input("StrDateF", sql.Char(10), mpcode === "COMP" ? dateStr : "");
    insertReq.input("StrHeureF", sql.Char(8), mpcode === "COMP" ? timeStr : "");
    insertReq.input("MODEPROD", sql.Int, mp.MPSEQ);
    insertReq.input("TjNote", sql.VarChar(7500), tjNote);
    insertReq.input("LOT_FAB", sql.Int, 0);
    insertReq.input("SMNOTRANS", sql.Char(9), "");
    insertReq.input("CNOMENCOP_MACHINE", sql.Int, copmachine || op.COPMACHINE || 0);
    insertReq.output("TJSEQ", sql.Int);
    insertReq.output("ERREUR", sql.Int);
    const insertResult = await insertReq.execute("Nba_Sp_Insert_Production");
    console.log(`[changeStatus] Insert SP raw output:`, JSON.stringify(insertResult.output));
    const newTjseq = insertResult.output.TJSEQ;
    const insertErr = insertResult.output.ERREUR;
    console.log(`[changeStatus] Inserted TEMPSPROD TJSEQ=${newTjseq} status=${mpcode} err=${insertErr}`);

    // Post-insert updates (mirrors legacy ajouteModifieStatut lines 1552-1614)
    if (newTjseq) {
      // Update CNOMENCOP and INVENTAIRE_C on the new row
      if (op.NOPSEQ) {
        await pool.request()
          .input("tjseq", sql.Int, newTjseq)
          .input("cnomencop", sql.Int, op.NOPSEQ)
          .input("inventaire", sql.Int, op.INVENTAIRE_SEQ || 0)
          .query(`UPDATE TEMPSPROD SET CNOMENCOP = @cnomencop, INVENTAIRE_C = @inventaire WHERE TJSEQ = @tjseq`);
      }

      // Mark operation as started in PL_RESULTAT
      if (op.NOPSEQ) {
        await pool.request()
          .input("nopseq", sql.Int, op.NOPSEQ)
          .input("modeprod", sql.Int, mp.MPSEQ)
          .query(`UPDATE PL_RESULTAT SET PR_DEBUTE = 1, MODEPROD = @modeprod WHERE CNOMENCOP = @nopseq`);
      }

      // If PAUSE/STOP/COMP: zero out hourly rates on new row
      if (mpcode === "PAUSE" || mpcode === "STOP" || mpcode === "COMP") {
        await pool.request()
          .input("tjseq", sql.Int, newTjseq)
          .query(`
            UPDATE TEMPSPROD SET
              TJEMTAUXHOR = 0, TJOPTAUXHOR = 0, TJMATAUXHOR = 0,
              TJSYSTEMPSHOMME = 0, TJTEMPSHOMME = 0,
              TJEMCOUT = 0, TJOPCOUT = 0, TJMACOUT = 0
            WHERE TJSEQ = @tjseq
          `);
      }

      // If STOP/COMP (not VCUT): recalculate costs on PREVIOUS PROD row
      // Old software checks both NO_INVENTAIRE AND PRODUIT_CODE for VCUT
      const isVcut = op.NO_INVENTAIRE === "VCUT" || op.PRODUIT_CODE === "VCUT";
      if ((mpcode === "STOP" || mpcode === "COMP") && !isVcut && tpResult.recordset.length > 0) {
        const prevTjseq = tpResult.recordset[0].TJSEQ;
        try {
          await pool.request()
            .input("tjseq", sql.Int, prevTjseq)
            .query(`
              UPDATE TEMPSPROD SET
                TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
                TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
                TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
                TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
                TJMACOUT = ISNULL(C.CALCMACOUT, 0),
                TJVALEUR_MATIERE = ISNULL(C.VALEUR_MATIERE, 0)
              FROM TEMPSPROD
              INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
              WHERE TEMPSPROD.TJSEQ = @tjseq
            `);
          console.log(`[changeStatus] Cost recalc on prev PROD TJSEQ=${prevTjseq}`);
        } catch (err) {
          console.warn("[changeStatus] Cost recalc skipped:", err.message);
        }

        // Also recalculate SETUP row costs if operation has setup time
        try {
          const setupCheck = await pool.request()
            .input("nopseq", sql.Int, op.NOPSEQ)
            .query(`SELECT NOPTEMPSETUP FROM CNOMENCOP WHERE NOPSEQ = @nopseq`);
          // Old software: NEQ 0 (includes negatives); match exactly
          if (setupCheck.recordset.length && setupCheck.recordset[0].NOPTEMPSETUP !== 0) {
            // Add copmachine filter to match old trouveDernierSetup query
            const setupReq = pool.request()
              .input("transac", sql.Int, transac)
              .input("nopseq", sql.Int, op.NOPSEQ);
            let setupQuery = `
                SELECT TOP 1 TJSEQ FROM TEMPSPROD
                WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
                  AND MODEPROD_MPCODE = 'Setup'
                  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'`;
            if (copmachine) {
              setupReq.input("copmachine", sql.Int, copmachine);
              setupQuery += ` AND cNomencOp_Machine = @copmachine`;
            }
            setupQuery += ` ORDER BY TJSEQ DESC`;
            const setupRow = await setupReq.query(setupQuery);
            if (setupRow.recordset.length) {
              const setupTjseq = setupRow.recordset[0].TJSEQ;
              await pool.request()
                .input("tjseq", sql.Int, setupTjseq)
                .query(`
                  UPDATE TEMPSPROD SET
                    TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
                    TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
                    TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
                    TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
                    TJMACOUT = ISNULL(C.CALCMACOUT, 0)
                  FROM TEMPSPROD
                  INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
                  WHERE TEMPSPROD.TJSEQ = @tjseq
                `);
              console.log(`[changeStatus] SETUP cost recalc TJSEQ=${setupTjseq}`);
            }
          }
        } catch (err) {
          console.warn("[changeStatus] SETUP cost recalc skipped:", err.message);
        }
      }
    }

    res.json({
      success: true,
      data: { transac, copmachine, newStatus, tjseq: newTjseq },
      message: `Status changed to ${newStatus}`,
    });
  })
);

// ─── GET /getMaterialOutput.cfm ──────────────────────────────────────────────
// Returns material output lines for the questionnaire screen.
// Uses the EXACT same query as the old software: SortieMateriel.cfc → afficheListeSortieMaterielQS
// Key: Uses CNOMENCOP = @nopseq filter in OUTER APPLY to ensure only materials
// for THIS specific operation are returned (e.g. CNC T-NUTs, not PRESS glue).
app.get(
  "/getMaterialOutput.cfm",
  handler(async (req, res) => {
    const { transac, nopseq } = req.query;

    if (!transac) {
      return res.json({ success: false, error: "transac is required" });
    }

    const pool = await getPool();
    const nopseqInt = Number(nopseq) || 0;

    // Step A: Find reference TJSEQ (PROD mode, with note pattern)
    // Mirrors SortieMateriel.cfc line 230-276
    let leTJSEQ = 0;
    if (nopseqInt > 0) {
      const refResult = await pool.request()
        .input("transac", sql.Int, Number(transac))
        .input("nopseq", sql.Int, nopseqInt)
        .query(`
          SELECT TOP 1 TJSEQ
          FROM TEMPSPROD
          WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
            AND MODEPROD_MPCODE = 'Prod'
            AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
          ORDER BY TJSEQ DESC
        `);
      if (refResult.recordset.length) {
        leTJSEQ = refResult.recordset[0].TJSEQ;
      } else {
        // Fallback: without TJNOTE filter
        const refResult2 = await pool.request()
          .input("transac", sql.Int, Number(transac))
          .input("nopseq", sql.Int, nopseqInt)
          .query(`
            SELECT TOP 1 TJSEQ
            FROM TEMPSPROD
            WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
              AND MODEPROD_MPCODE = 'Prod'
            ORDER BY TJSEQ DESC
          `);
        if (refResult2.recordset.length) {
          leTJSEQ = refResult2.recordset[0].TJSEQ;
        }
      }
    }

    // Step B: Get reference row quantities and SMNOTRANS
    let refSmnotrans = "";
    let refQteProd = 0;
    let refQteDefect = 0;
    let refCnomenclature = 0;
    let refPfnotrans = 0;
    if (leTJSEQ > 0) {
      const refRow = await pool.request()
        .input("tjseq", sql.Int, leTJSEQ)
        .query(`SELECT TJQTEPROD, TJQTEDEFECT, SMNOTRANS, CNOMENCLATURE, ENTRERPRODFINI_PFNOTRANS FROM TEMPSPROD WHERE TJSEQ = @tjseq`);
      if (refRow.recordset.length) {
        const r = refRow.recordset[0];
        refSmnotrans = (r.SMNOTRANS || "").trim();
        refQteProd = r.TJQTEPROD || 0;
        refQteDefect = r.TJQTEDEFECT || 0;
        refCnomenclature = r.CNOMENCLATURE || 0;
        refPfnotrans = r.ENTRERPRODFINI_PFNOTRANS || 0;
      }
    }

    // Step C: Main material query — EXACT same as old software (SortieMateriel.cfc line 428-481)
    // Uses OUTER APPLY with CNOMENCOP = @nopseq to filter by THIS operation
    const matReq = pool.request()
      .input("transac", sql.Int, Number(transac))
      .input("tjseq", sql.Int, leTJSEQ);
    if (nopseqInt > 0) {
      matReq.input("nopseq", sql.Int, nopseqInt);
    }

    // Build WHERE clause — mirrors old software's OR conditions
    let smWhere = "1=0";
    if (refSmnotrans) {
      matReq.input("smnotrans", sql.VarChar(9), refSmnotrans.substring(0, 9));
      smWhere += " OR T.TRNO = @smnotrans";
    }
    // Always check by TJSEQ references
    smWhere += `
      OR EXISTS (SELECT 1 FROM TEMPSPROD TPX WHERE TPX.SMNOTRANS = T.TRNO AND TPX.TJSEQ = @tjseq)
    `;

    const matResult = await matReq.query(`
      SELECT DISTINCT
        DT.DTRSEQ, T.TRNO AS TRANSAC_TRNO, DT.CONTENANT, DT.CONTENANT_CON_NUMERO,
        DT.DTRQTE, DT.DTRQTECUM_CONT, DT.NO_SERIE_NSNO_SERIE,
        DT.ENTREPOT, DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
        DT.ENTREPOT_ENCODE_SO, DT.ENTREPOT_ENDESC_P_SO, DT.ENTREPOT_ENDESC_S_SO,
        T.INVENTAIRE, T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
        T.UNITE_INV_UNDESC1, T.UNITE_INV_UNDESC2,
        ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE,
        TP.TJQTEPROD, TP.TJQTEDEFECT, TP.INVENTAIRE_C, TP.CNOMENCLATURE
      FROM TRANSAC T
      LEFT OUTER JOIN cNOMENCLATURE CN ON T.TRSEQ = CN.TRANSAC
      LEFT OUTER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = CN.TRANSAC
      LEFT OUTER JOIN INVENTAIRE IP ON IP.INSEQ = CNOP.INVENTAIRE_P
      LEFT OUTER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
      LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = CN.INVENTAIRE_M
      OUTER APPLY (
        SELECT TOP 1 TP2.TJSEQ, TP2.TJQTEPROD, TP2.TJQTEDEFECT, TP2.INVENTAIRE_C, TP2.CNOMENCLATURE
        FROM TEMPSPROD TP2
        WHERE TP2.SMNOTRANS = T.TRNO
          AND TP2.TRANSAC = @transac
          ${nopseqInt > 0 ? "AND TP2.CNOMENCOP = @nopseq" : ""}
        ORDER BY TP2.TJSEQ DESC
      ) TP
      OUTER APPLY (
        SELECT DT.DTRQTE_INV + ISNULL((
          SELECT SUM(DTCOR.DTRQTE_INV) QTE
          FROM DET_TRANS DTCOR
          INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC)
          WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
        ), 0) DTRQTE_TRANSACTION
      ) DETTRANS
      WHERE 1=1 AND (${smWhere})
      AND DT.DTRSEQ IS NOT NULL
    `);

    // Fetch BOM ratio from cNOMENCLATURE
    let bomRatio = null;
    const cnomenclature = refCnomenclature || (matResult.recordset[0]?.CNOMENCLATURE || 0);
    if (cnomenclature) {
      const ratioResult = await pool.request()
        .input("niseq", sql.Int, cnomenclature)
        .query(`SELECT NIQTE FROM cNOMENCLATURE WHERE NISEQ_PERE = @niseq`);
      if (ratioResult.recordset.length) {
        bomRatio = ratioResult.recordset[0].NIQTE;
      }
    }

    let materials = matResult.recordset.map((m) => ({
      id: m.DTRSEQ,
      code: m.INVENTAIRE_INNOINV || "",
      description_P: m.INVENTAIRE_INDESC1 || "",
      description_S: m.INVENTAIRE_INDESC2 || "",
      unit_P: m.UNITE_INV_UNDESC1 || "",
      unit_S: m.UNITE_INV_UNDESC2 || "",
      originalQty: m.DTRQTE || 0,
      correctedQty: m.QTECORRIGEE ?? (m.DTRQTE || 0),
      warehouse: m.ENTREPOT_ENCODE || "",
      warehouse_P: m.ENTREPOT_ENDESC_P || "",
      warehouse_S: m.ENTREPOT_ENDESC_S || "",
      container: m.CONTENANT_CON_NUMERO || "",
    }));

    // If no existing SM materials found, get expected materials from BOM
    // (cNOMENCOP → cNOMENCLATURE → INVENTAIRE) so the table shows what WILL be outed
    if (materials.length === 0 && nopseqInt > 0) {
      try {
        const bomResult = await pool.request()
          .input("transac", sql.Int, Number(transac))
          .input("nopseq", sql.Int, nopseqInt)
          .query(`
            SELECT CN.NISEQ AS id,
                   IM.INNOINV AS code,
                   IM.INDESC1 AS description_P,
                   IM.INDESC2 AS description_S,
                   UM.UNDESC1 AS unit_P,
                   UM.UNDESC2 AS unit_S,
                   CN.NIQTE AS bomRatio,
                   IW.ENCODE AS warehouse,
                   IW.ENDESC_P AS warehouse_P,
                   IW.ENDESC_S AS warehouse_S
            FROM cNOMENCOP COP
            INNER JOIN cNOMENCLATURE CN ON CN.NISEQ_PERE = COP.CNOMENCLATURE
            INNER JOIN INVENTAIRE IM ON IM.INSEQ = CN.INVENTAIRE_M
            LEFT OUTER JOIN UNITE UM ON UM.UNSEQ = IM.UNITE
            LEFT OUTER JOIN ENTREPOT IW ON IW.ENSEQ = IM.ENTREPOT
            WHERE COP.TRANSAC = @transac
              AND COP.NOPSEQ = @nopseq
              AND CN.NIQTE <> 0
          `);
        if (bomResult.recordset.length) {
          materials = bomResult.recordset.map((m) => ({
            id: m.id,
            code: m.code || "",
            description_P: m.description_P || "",
            description_S: m.description_S || "",
            unit_P: m.unit_P || "",
            unit_S: m.unit_S || "",
            originalQty: 0,
            correctedQty: 0,
            warehouse: m.warehouse || "",
            warehouse_P: m.warehouse_P || "",
            warehouse_S: m.warehouse_S || "",
            container: "",
          }));
          // Use the first BOM ratio found (they should all be the same for non-VCUT)
          if (!bomRatio && bomResult.recordset[0]?.bomRatio) {
            bomRatio = bomResult.recordset[0].bomRatio;
          }
          console.log(`[getMaterialOutput] BOM fallback: ${materials.length} materials from BOM for NOPSEQ=${nopseqInt}`);
        }
      } catch (err) {
        console.warn("[getMaterialOutput] BOM fallback skipped:", err.message);
      }
    }

    const hasFinishedProduct = refPfnotrans > 0;

    res.json({
      success: true,
      data: {
        materials,
        bomRatio,
        hasFinishedProduct,
        originalGoodQty: refQteProd,
        originalDefectQty: refQteDefect,
      },
    });
  })
);

// ─── GET /getCorrection.cfm ──────────────────────────────────────────────────
// Returns TEMPSPROD record + defects, finished products, materials for correction screen.
app.get(
  "/getCorrection.cfm",
  handler(async (req, res) => {
    const { tjseq } = req.query;

    if (!tjseq) {
      return res.json({ success: false, error: "tjseq is required" });
    }

    const pool = await getPool();

    // Main TEMPSPROD record with joins
    const mainReq = pool.request().input("tjseq", sql.Int, Number(tjseq));
    const mainResult = await mainReq.query(`
      SELECT
        T.TJSEQ, T.TRANSAC, T.TRANSAC_TRNO, T.TRANSAC_TRITEM,
        T.TJDEBUTDATE, T.TJFINDATE, T.TJDUREE,
        T.TJQTEPROD, T.TJQTEDEFECT,
        T.EMPLOYE_EMNOM, T.EMPLOYE_EMNO,
        T.MODEPROD_MPCODE, T.MODEPROD_MPDESC_P, T.MODEPROD_MPDESC_S,
        T.MACHINE_MACODE, T.MACHINE_MADESC_P, T.MACHINE_MADESC_S,
        T.OPERATION_OPDESC_P, T.OPERATION_OPDESC_S,
        T.SMNOTRANS, T.ENTRERPRODFINI_PFNOTRANS,
        T.CNOMENCOP, T.cNOMENCLATURE, T.INVENTAIRE_C,
        T.EMPLOYE, T.OPERATION, T.MACHINE,
        (SELECT TOP 1 MP.MPSEQ FROM MODEPROD MP WHERE MP.MPCODE = T.MODEPROD_MPCODE) AS MODEPROD,
        D.DECODE, D.DEDESCRIPTION_P, D.DEDESCRIPTION_S,
        M.DEPARTEMENT,
        FM.FMCODE,
        dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) AS NO_PROD,
        I.INDESC1, I.INDESC2,
        CASE WHEN I.INNOINV = 'VCUT' THEN 1 ELSE 0 END AS EST_VCUT,
        CASE WHEN T.ENTRERPRODFINI_PFNOTRANS IS NOT NULL AND LTRIM(RTRIM(T.ENTRERPRODFINI_PFNOTRANS)) <> '' THEN 1 ELSE 0 END AS ENTREPF
      FROM TEMPSPROD T
      INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
      INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
      LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
      LEFT OUTER JOIN FAMILLEMACHINE FM ON M.FAMILLEMACHINE = FM.FMSEQ
      WHERE T.TJSEQ = @tjseq
    `);

    if (!mainResult.recordset.length) {
      return res.json({ success: false, error: "TEMPSPROD record not found" });
    }

    const r = mainResult.recordset[0];
    // Debug: log row count
    if (mainResult.recordset.length > 1) {
      console.log(`[WARN] getCorrection: ${mainResult.recordset.length} rows for TJSEQ ${tjseq}`);
    }

    const fmtDate = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")} ${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
    };

    // Parse duration string to minutes
    const parseDuree = (raw) => {
      const s = String(raw || "0:00").trim();
      const [h, m] = s.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    // Fetch defects, finished products, and materials in parallel
    // Queries mirror legacy CF: QteDefect.cfc, ProduitFini.cfc, SortieMateriel.cfc
    const tjseqInt = Number(tjseq);
    const transac = r.TRANSAC;
    const cnomencop = r.CNOMENCOP;
    const fmseq = r.DEPARTEMENT; // machine's department for family lookup

    const [defectsResult, fpResult, materialsResult, opsResult, machinesResult] = await Promise.all([
      // DET_DEFECT — mirrors QteDefect.cfc → afficheTableauDEFECT
      pool.request().input("tjseq", sql.Int, tjseqInt).query(`
        SELECT DD.DDSEQ, DD.TRANSAC, DD.INVENTAIRE, DD.MACHINE, DD.EMPLOYE,
               DD.DDQTEUNINV, DD.DDDATE, DD.RAISON, DD.DDNOTE,
               DD.DDVALEUR_ESTIME_UNITAIRE, DD.DDVALEUR_ESTIME_TOTALE,
               DD.TEMPSPROD, DD.TRANSAC_PERE,
               R.RRCODE, R.RRDESC_P, R.RRDESC_S
        FROM DET_DEFECT DD
        LEFT JOIN RAISON R ON R.RRSEQ = DD.RAISON
        WHERE DD.TEMPSPROD = @tjseq
          AND DD.DDQTEUNINV <> 0
        ORDER BY DD.DDSEQ
      `),
      // Finished products — mirrors ProduitFini.cfc → afficheListeProduitFini
      pool.request().input("tjseq", sql.Int, tjseqInt).query(`
        SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO,
               DT.DTRQTE, DT.DTRQTECUM_CONT, DT.NO_SERIE_NSNO_SERIE,
               DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
               DT.ENTREPOT_ENCODE_SO, DT.ENTREPOT_ENDESC_P_SO, DT.ENTREPOT_ENDESC_S_SO,
               T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
               ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE
        FROM DET_TRANS DT
        INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
        INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
        OUTER APPLY (
          SELECT DT.DTRQTE_INV + ISNULL((
            SELECT SUM(DTCOR.DTRQTE_INV) QTE
            FROM DET_TRANS DTCOR
            INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
            WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
          ), 0) DTRQTE_TRANSACTION
        ) DETTRANS
        WHERE TP.TJSEQ = @tjseq
      `),
      // Materials — mirrors SortieMateriel.cfc → afficheListeSortieMateriel
      // Includes NIQTE (BOM ratio) from cNOMENCLATURE for calculeQteSM
      pool.request().input("tjseq", sql.Int, tjseqInt).query(`
        SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO,
               DT.DTRQTE, DT.DTRQTECUM_CONT, DT.NO_SERIE_NSNO_SERIE,
               DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
               DT.ENTREPOT_ENCODE_SO, DT.ENTREPOT_ENDESC_P_SO, DT.ENTREPOT_ENDESC_S_SO,
               T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
               T.UNITE_INV_UNDESC1, T.UNITE_INV_UNDESC2,
               T.INVENTAIRE AS INVENTAIRE_MSEQ,
               ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE,
               ISNULL((
                 SELECT MAX(CN.NIQTE)
                 FROM cNOMENCLATURE CN
                 WHERE CN.NISEQ_PERE = ISNULL(NULLIF(TP.cNOMENCLATURE, 0), (
                   SELECT TOP 1 NOP.cNOMENCLATURE
                   FROM cNOMENCOP NOP
                   WHERE NOP.TRANSAC = TP.TRANSAC
                     AND NOP.INVENTAIRE_P = TP.INVENTAIRE_C
                     AND NOP.cNOMENCLATURE > 0
                 ))
                   AND CN.INVENTAIRE_M = T.INVENTAIRE
               ), 0) AS NIQTE
        FROM TEMPSPROD TP
        INNER JOIN DET_TRANS DT ON DT.TRANSAC_TRNO = TP.SMNOTRANS
        INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
        OUTER APPLY (
          SELECT DT.DTRQTE_INV + ISNULL((
            SELECT SUM(DTCOR.DTRQTE_INV) QTE
            FROM DET_TRANS DTCOR
            INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
            WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
          ), 0) DTRQTE_TRANSACTION
        ) DETTRANS
        WHERE TP.TJSEQ = @tjseq
      `),
      // Operations — mirrors TempsProd.cfc → trouveOperations (returns all)
      pool.request().query(`
        SELECT OPSEQ, OPCODE, OPDESC_P, OPDESC_S
        FROM OPERATION
        ORDER BY OPCODE
      `),
      // Machines — mirrors TempsProd.cfc → trouveMachines (filtered by family FK)
      pool.request().input("tjseq", sql.Int, tjseqInt).query(`
        SELECT M2.MASEQ, M2.MACODE, M2.MADESC_P, M2.MADESC_S
        FROM MACHINE M2
        WHERE M2.FAMILLEMACHINE = (
          SELECT TOP 1 M1.FAMILLEMACHINE FROM TEMPSPROD TP
          INNER JOIN MACHINE M1 ON TP.MACHINE = M1.MASEQ
          WHERE TP.TJSEQ = @tjseq
        )
        ORDER BY M2.MACODE
      `),
    ]);

    const data = {
      TJSEQ: r.TJSEQ,
      TRANSAC: r.TRANSAC,
      NO_PROD: r.NO_PROD || `${r.TRANSAC_TRNO}-${String(r.TRANSAC_TRITEM).padStart(3, "0")}`,
      NOM_CLIENT: "",
      PRODUIT_P: r.INDESC1 || "",
      PRODUIT_S: r.INDESC2 || "",
      TJDEBUT: fmtDate(r.TJDEBUTDATE),
      TJFIN: fmtDate(r.TJFINDATE),
      TJDUREE: parseDuree(r.TJDUREE),
      EMNOM: r.EMPLOYE_EMNOM || "",
      EMNOIDENT: r.EMPLOYE_EMNO || 0,
      MACODE: r.MACHINE_MACODE || "",
      MACHINE_P: r.MACHINE_MADESC_P || "",
      MACHINE_S: r.MACHINE_MADESC_S || "",
      DECODE: r.DECODE || "",
      OPERATION_P: r.OPERATION_OPDESC_P || "",
      OPERATION_S: r.OPERATION_OPDESC_S || "",
      MODEPROD_MPCODE: r.MODEPROD_MPCODE || "",
      MODEPROD: r.MODEPROD || 0,
      ENTREPF: r.ENTREPF,
      QTE_BONNE: r.TJQTEPROD || 0,
      QTE_DEFAUT: r.TJQTEDEFECT || 0,
      CNOMENCOP: r.CNOMENCOP || 0,
      CNOMENCLATURE: r.cNOMENCLATURE || 0,
      INVENTAIRE_C: r.INVENTAIRE_C || 0,
      SMNOTRANS: r.SMNOTRANS || "",
      EMPLOYE_EMNO: String(r.EMPLOYE_EMNO || ""),
      OPERATION_SEQ: r.OPERATION || 0,
      MACHINE_SEQ: r.MACHINE || 0,
      FMCODE: r.FMCODE || "",
      EST_VCUT: r.EST_VCUT || 0,
      defects: defectsResult.recordset.map((d) => ({
        id: d.DDSEQ,
        typeId: d.RAISON,
        type_P: d.RRDESC_P || "",
        type_S: d.RRDESC_S || "",
        originalQty: d.DDQTEUNINV || 0,
        correctedQty: d.DDQTEUNINV || 0,
      })),
      finishedProducts: fpResult.recordset.map((fp) => ({
        id: fp.DTRSEQ,
        product: fp.INVENTAIRE_INNOINV || "",
        container: fp.CONTENANT_CON_NUMERO || "",
        description_P: fp.INVENTAIRE_INDESC1 || "",
        description_S: fp.INVENTAIRE_INDESC2 || "",
        warehouse: fp.ENTREPOT_ENCODE || "",
        warehouse_P: fp.ENTREPOT_ENDESC_P || "",
        warehouse_S: fp.ENTREPOT_ENDESC_S || "",
        originalQty: fp.DTRQTE || 0,
        correctedQty: fp.QTECORRIGEE ?? (fp.DTRQTE || 0),
      })),
      materials: materialsResult.recordset.map((m) => ({
        id: m.DTRSEQ,
        code: m.INVENTAIRE_INNOINV || "",
        description_P: m.INVENTAIRE_INDESC1 || "",
        description_S: m.INVENTAIRE_INDESC2 || "",
        unit_P: m.UNITE_INV_UNDESC1 || "",
        unit_S: m.UNITE_INV_UNDESC2 || "",
        warehouse: m.ENTREPOT_ENCODE || "",
        warehouse_P: m.ENTREPOT_ENDESC_P || "",
        warehouse_S: m.ENTREPOT_ENDESC_S || "",
        originalQty: m.DTRQTE || 0,
        correctedQty: m.QTECORRIGEE ?? (m.DTRQTE || 0),
        niqte: m.NIQTE || 0,
      })),
      operations: opsResult.recordset.map((op) => ({
        OPSEQ: op.OPSEQ,
        OPCODE: op.OPCODE || "",
        OPDESC_P: op.OPDESC_P || "",
        OPDESC_S: op.OPDESC_S || "",
      })),
      machines: machinesResult.recordset.map((ma) => ({
        MASEQ: ma.MASEQ,
        MACODE: ma.MACODE || "",
        MADESC_P: ma.MADESC_P || "",
        MADESC_S: ma.MADESC_S || "",
      })),
    };

    res.json({
      success: true,
      data,
      message: "Correction data retrieved",
    });
  })
);

// ─── POST /submitCorrection.cfm ──────────────────────────────────────────────
// Mirrors legacy CF: CorrectionInventaire.cfc → CorrigeProduction
// Updates quantities on TEMPSPROD, existing defects in DET_DEFECT, and inserts new defects.
app.post(
  "/submitCorrection.cfm",
  handler(async (req, res) => {
    const { tjseq, goodQty, defects, newDefects, finishedProducts, startDate, endDate, employeeCode } = req.body;

    if (!tjseq) {
      return res.json({ success: false, error: "tjseq is required" });
    }

    const pool = await getPool();
    const totalDefect = (defects || []).reduce((sum, d) => sum + (d.qty || 0), 0)
      + (newDefects || []).reduce((sum, d) => sum + (d.qty || 0), 0);

    // ── Parse start/end from the submitted form values (mirrors CF: form.DateDebut_TJSEQ, form.DateFin_TJSEQ)
    // Frontend sends "yyyy-MM-dd HH:mm" (space) or "yyyy-MM-ddTHH:mm" (ISO T)
    function parseDateTimeStr(dt) {
      if (!dt) return { datePart: null, timePart: null };
      const normalized = dt.replace("T", " ");
      const [datePart = "", timePart = "00:00"] = normalized.split(" ");
      return { datePart, timePart: timePart + ":00" }; // → "HH:mm:ss"
    }
    const parsed = {
      start: parseDateTimeStr(startDate),
      end: parseDateTimeStr(endDate),
    };

    // ── Load full TEMPSPROD row for SP parameters
    const tpResult = await pool.request()
      .input("tjseq", sql.Int, tjseq)
      .query(`
        SELECT TJSEQ, TRANSAC, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE,
               INVENTAIRE_C, CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
               SMNOTRANS, TJDEBUTDATE, TJFINDATE, TJQTEPROD, TJQTEDEFECT,
               ENTRERPRODFINI_PFNOTRANS
        FROM TEMPSPROD WHERE TJSEQ = @tjseq
      `);
    if (!tpResult.recordset.length) {
      return res.json({ success: false, error: "TEMPSPROD record not found" });
    }
    const tp = tpResult.recordset[0];

    // ── STEP 1: Correct finished product quantities via Nba_Corrige_Quantite_Transaction
    if (finishedProducts && finishedProducts.length > 0) {
      for (const fp of finishedProducts) {
        const corrReq = pool.request();
        corrReq.input("DTRSEQ", sql.Int, fp.dtrseq);
        corrReq.input("DTRQTE_CORRECTION", sql.Float, fp.qty);
        corrReq.input("USAGER", sql.VarChar(50), "WebUI Correction");
        corrReq.output("ERREUR", sql.Int);
        corrReq.output("MSG_EQUATE", sql.VarChar(255));
        const corrResult = await corrReq.execute("Nba_Corrige_Quantite_Transaction");
        console.log(`[submitCorrection] Nba_Corrige_Quantite_Transaction FP DTRSEQ=${fp.dtrseq} qty=${fp.qty} err=${corrResult.output.ERREUR}`);
      }
    }

    // ── STEP 1b: Correct material output (SM) quantities via Nba_Corrige_Quantite_Transaction
    // Mirrors CorrectionInventaire.cfc lines 299-342
    const { materials } = req.body;
    if (materials && materials.length > 0) {
      for (const mat of materials) {
        const corrReq = pool.request();
        corrReq.input("DTRSEQ", sql.Int, mat.dtrseq);
        corrReq.input("DTRQTE_CORRECTION", sql.Float, mat.qty);
        corrReq.input("USAGER", sql.VarChar(50), req.body.employeeName || "WebUI Correction");
        corrReq.output("ERREUR", sql.Int);
        corrReq.output("MSG_EQUATE", sql.VarChar(255));
        const corrResult = await corrReq.execute("Nba_Corrige_Quantite_Transaction");
        console.log(`[submitCorrection] Nba_Corrige_Quantite_Transaction SM DTRSEQ=${mat.dtrseq} qty=${mat.qty} err=${corrResult.output.ERREUR}`);
      }
    }

    // ── STEP 2: Update existing defect quantities
    if (defects && defects.length > 0) {
      for (const d of defects) {
        await pool.request()
          .input("ddseq", sql.Int, d.ddseq)
          .input("qty", sql.Float, d.qty)
          .query(`UPDATE DET_DEFECT SET DDQTEUNINV = @qty WHERE DDSEQ = @ddseq`);
      }
    }

    // ── STEP 3: Insert new defects
    if (newDefects && newDefects.length > 0) {
      for (const d of newDefects) {
        if (!d.typeId || !d.qty || d.qty <= 0) continue;
        await pool.request()
          .input("tempsprod", sql.Int, tjseq)
          .input("transac", sql.Int, tp.TRANSAC)
          .input("inventaire", sql.Int, tp.INVENTAIRE_C || 0)
          .input("machine", sql.Int, tp.MACHINE || 0)
          .input("employe", sql.Int, tp.EMPLOYE || 0)
          .input("raison", sql.Int, d.typeId)
          .input("qty", sql.Float, d.qty)
          .query(`
            INSERT INTO DET_DEFECT (TEMPSPROD, TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, RAISON, DDQTEUNINV, DDDATE)
            VALUES (@tempsprod, @transac, @inventaire, @machine, @employe, @raison, @qty, GETDATE())
          `);
      }
    }

    // ── STEP 4: Close/update TEMPSPROD via Nba_Sp_Update_Production (same SP as old software)
    // ── Use submitted start/end dates (mirrors CF: form.DateDebut_TJSEQ / form.DateFin_TJSEQ)
    // Fall back to original DB values only if frontend didn't send them
    let startDateStr, startTimeStr, endDateStr, endTimeStr;
    if (parsed.start.datePart) {
      startDateStr = parsed.start.datePart;
      startTimeStr = parsed.start.timePart;
    } else {
      const startDt = new Date(tp.TJDEBUTDATE);
      startDateStr = `${startDt.getUTCFullYear()}-${String(startDt.getUTCMonth() + 1).padStart(2, "0")}-${String(startDt.getUTCDate()).padStart(2, "0")}`;
      startTimeStr = `${String(startDt.getUTCHours()).padStart(2, "0")}:${String(startDt.getUTCMinutes()).padStart(2, "0")}:${String(startDt.getUTCSeconds()).padStart(2, "0")}`;
    }
    if (parsed.end.datePart) {
      endDateStr = parsed.end.datePart;
      endTimeStr = parsed.end.timePart;
    } else if (tp.TJFINDATE) {
      const endDt = new Date(tp.TJFINDATE);
      endDateStr = `${endDt.getUTCFullYear()}-${String(endDt.getUTCMonth() + 1).padStart(2, "0")}-${String(endDt.getUTCDate()).padStart(2, "0")}`;
      endTimeStr = `${String(endDt.getUTCHours()).padStart(2, "0")}:${String(endDt.getUTCMinutes()).padStart(2, "0")}:${String(endDt.getUTCSeconds()).padStart(2, "0")}`;
    } else {
      const now = new Date();
      endDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      endTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    }
    console.log(`[submitCorrection] dates: start=${startDateStr} ${startTimeStr} end=${endDateStr} ${endTimeStr}`);

    // ── Resolve EMSEQ from submitted employeeCode (mirrors CF: trouveEmploye by EMNO)
    let emseq = tp.EMPLOYE || 0;
    if (employeeCode) {
      const emResult = await pool.request()
        .input("emno", sql.VarChar(5), String(employeeCode).substring(0, 5))
        .query(`SELECT TOP 1 EMSEQ FROM EMPLOYE WHERE EMNO = @emno`);
      if (emResult.recordset.length) emseq = emResult.recordset[0].EMSEQ;
    }

    const updateReq = pool.request();
    updateReq.input("TJSEQ", sql.Int, tjseq);
    updateReq.input("EMPLOYE", sql.Int, emseq);
    updateReq.input("OPERATION", sql.Int, tp.OPERATION);
    updateReq.input("MACHINE", sql.Int, tp.MACHINE);
    updateReq.input("TRSEQ", sql.Int, tp.TRANSAC);
    updateReq.input("NO_SERIE", sql.Int, 0);
    updateReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
    updateReq.input("cNOMENCLATURE", sql.Int, tp.cNOMENCLATURE || 0);
    updateReq.input("INVENTAIRE_C", sql.Int, tp.INVENTAIRE_C || 0);
    updateReq.input("TJVALIDE", sql.Bit, 1);
    updateReq.input("TJPROD_TERMINE", sql.Bit, 0);
    updateReq.input("TJQTEPROD", sql.Float, goodQty ?? tp.TJQTEPROD);
    updateReq.input("TJQTEDEFECT", sql.Float, totalDefect);
    updateReq.input("StrDateD", sql.Char(10), startDateStr);
    updateReq.input("StrHeureD", sql.Char(8), startTimeStr);
    updateReq.input("StrDateF", sql.Char(10), endDateStr);
    updateReq.input("StrHeureF", sql.Char(8), endTimeStr);
    updateReq.input("sModeProd", sql.VarChar(5), (tp.MODEPROD_MPCODE || "Prod").substring(0, 5));
    updateReq.input("TjNote", sql.VarChar(7500), "Correction temps prod avec Ecran de production New");
    updateReq.input("SMNOTRANS", sql.Char(9), (tp.SMNOTRANS || "").substring(0, 9));
    updateReq.output("ERREUR", sql.Int);
    const updateResult = await updateReq.execute("Nba_Sp_Update_Production");
    console.log(`[submitCorrection] Nba_Sp_Update_Production TJSEQ=${tjseq} err=${updateResult.output.ERREUR}`);

    // ── STEP 5: Recalculate costs via FctCalculTempsDeProduction
    try {
      await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .query(`
          UPDATE TEMPSPROD SET
            TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
            TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
            TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
            TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
            TJMACOUT = ISNULL(C.CALCMACOUT, 0)
          FROM TEMPSPROD
          INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
          WHERE TEMPSPROD.TJSEQ = @tjseq
        `);
    } catch (err) {
      console.warn("[submitCorrection] FctCalculTempsDeProduction skipped:", err.message);
    }

    // ── STEP 6: Recalculate in-progress product via Nba_Recalcul_Un_Produit_EnCours
    try {
      const recalcReq = pool.request();
      recalcReq.input("TRANSAC", sql.Int, tp.TRANSAC);
      recalcReq.input("MODE_TEST", sql.Bit, 0);
      await recalcReq.execute("Nba_Recalcul_Un_Produit_EnCours");
      console.log(`[submitCorrection] Nba_Recalcul_Un_Produit_EnCours called`);
    } catch (err) {
      console.warn("[submitCorrection] Nba_Recalcul_Un_Produit_EnCours skipped:", err.message);
    }

    // ── STEP 7: Adjust next TEMPSPROD row's start time (mirrors CorrectionInventaire.cfc lines 425-469)
    // Find the next status row after current one for the same operation
    try {
      const nextRow = await pool.request()
        .input("transac", sql.Int, tp.TRANSAC)
        .input("cnomencop", sql.Int, tp.CNOMENCOP)
        .input("tjseq", sql.Int, tjseq)
        .query(`
          SELECT TOP 1 TJSEQ, MACHINE, TRANSAC, OPERATION, EMPLOYE, MODEPROD_MPCODE,
                 TJDEBUTDATE, TJFINDATE, TJQTEPROD, TJQTEDEFECT, CNOMENCLATURE,
                 INVENTAIRE_C, SMNOTRANS
          FROM TEMPSPROD
          WHERE TRANSAC = @transac AND CNOMENCOP = @cnomencop AND TJSEQ > @tjseq
          ORDER BY TJSEQ ASC
        `);
      if (nextRow.recordset.length) {
        const nxt = nextRow.recordset[0];
        // Next row's start = current row's end time (from the updated row)
        const updatedRow = await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .query(`SELECT TJFINDATE FROM TEMPSPROD WHERE TJSEQ = @tjseq`);
        const endDate = updatedRow.recordset[0]?.TJFINDATE;
        if (endDate) {
          // CRITICAL: mssql driver returns datetime as JS Date tagged UTC. Use getUTC*().
          const endDt = new Date(endDate);
          const nxtStartDate = `${endDt.getUTCFullYear()}-${String(endDt.getUTCMonth() + 1).padStart(2, "0")}-${String(endDt.getUTCDate()).padStart(2, "0")}`;
          const nxtStartTime = `${String(endDt.getUTCHours()).padStart(2, "0")}:${String(endDt.getUTCMinutes()).padStart(2, "0")}:${String(endDt.getUTCSeconds()).padStart(2, "0")}`;
          // End date/time for next row: use its existing TJFINDATE if set, else empty
          let nxtEndDate = "";
          let nxtEndTime = "";
          if (nxt.TJFINDATE) {
            const nxtEnd = new Date(nxt.TJFINDATE);
            nxtEndDate = `${nxtEnd.getUTCFullYear()}-${String(nxtEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(nxtEnd.getUTCDate()).padStart(2, "0")}`;
            nxtEndTime = `${String(nxtEnd.getUTCHours()).padStart(2, "0")}:${String(nxtEnd.getUTCMinutes()).padStart(2, "0")}:${String(nxtEnd.getUTCSeconds()).padStart(2, "0")}`;
          }
          const nxtUpdateReq = pool.request();
          nxtUpdateReq.input("TJSEQ", sql.Int, nxt.TJSEQ);
          nxtUpdateReq.input("EMPLOYE", sql.Int, nxt.EMPLOYE || 0);
          nxtUpdateReq.input("OPERATION", sql.Int, nxt.OPERATION);
          nxtUpdateReq.input("MACHINE", sql.Int, nxt.MACHINE);
          nxtUpdateReq.input("TRSEQ", sql.Int, nxt.TRANSAC);
          nxtUpdateReq.input("NO_SERIE", sql.Int, 0);
          nxtUpdateReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
          nxtUpdateReq.input("cNOMENCLATURE", sql.Int, nxt.CNOMENCLATURE || 0);
          nxtUpdateReq.input("INVENTAIRE_C", sql.Int, nxt.INVENTAIRE_C || 0);
          nxtUpdateReq.input("TJVALIDE", sql.Bit, 1);
          nxtUpdateReq.input("TJPROD_TERMINE", sql.Bit, 0);
          nxtUpdateReq.input("TJQTEPROD", sql.Float, nxt.TJQTEPROD || 0);
          nxtUpdateReq.input("TJQTEDEFECT", sql.Float, nxt.TJQTEDEFECT || 0);
          nxtUpdateReq.input("StrDateD", sql.Char(10), nxtStartDate);
          nxtUpdateReq.input("StrHeureD", sql.Char(8), nxtStartTime);
          nxtUpdateReq.input("StrDateF", sql.Char(10), nxtEndDate);
          nxtUpdateReq.input("StrHeureF", sql.Char(8), nxtEndTime);
          nxtUpdateReq.input("sModeProd", sql.VarChar(5), (nxt.MODEPROD_MPCODE || "Prod").substring(0, 5));
          nxtUpdateReq.input("TjNote", sql.VarChar(7500), "Correction temps prod avec Ecran de production New");
          nxtUpdateReq.input("SMNOTRANS", sql.Char(9), (nxt.SMNOTRANS || "").substring(0, 9));
          nxtUpdateReq.output("ERREUR", sql.Int);
          await nxtUpdateReq.execute("Nba_Sp_Update_Production");
          console.log(`[submitCorrection] Adjusted next row TJSEQ=${nxt.TJSEQ} start to match current end`);
        }
      }
    } catch (err) {
      console.warn("[submitCorrection] Next row adjustment skipped:", err.message);
    }

    console.log(`[submitCorrection] TJSEQ=${tjseq} good=${goodQty} defect=${totalDefect} newDefects=${(newDefects || []).length}`);

    res.json({
      success: true,
      data: { TJSEQ: tjseq },
      message: "Correction saved",
    });
  })
);

// ─── GET /getEmployeeHours.cfm ───────────────────────────────────────────────
// Exact replica of afficheTempsEmploye (operation.cfc:5560-5734)
app.get(
  "/getEmployeeHours.cfm",
  handler(async (req, res) => {
    const employeeCode = parseInt(req.query.employeeCode, 10) || 0;
    const dateStr = req.query.date; // yyyy-mm-dd

    // Create date range from single date (operation.cfc:5582-5584)
    const dateDebut = `${dateStr} 00:00:00`;
    const dateFin = new Date(dateStr);
    dateFin.setDate(dateFin.getDate() + 1);
    const dateFinStr = `${dateFin.toISOString().slice(0, 10)} 00:00:00`;

    // Query EMPLOYE_HEURES on EXT datasource with AutoFAB_ view joins
    // Employee filter is optional — if 0, return all entries for that date
    const poolExt = await getPoolExt();
    const request = poolExt
      .request()
      .input("dateDebut", sql.DateTime, new Date(dateDebut))
      .input("dateFin", sql.DateTime, new Date(dateFinStr));

    let employeeFilter = "";
    if (employeeCode > 0) {
      request.input("employe", sql.Int, employeeCode);
      employeeFilter = "AND EH.EMPLOYE = @employe";
    }

    const result = await request.query(`
        SELECT EH.EMPHSEQ, EH.EMPHDATEDEBUT, EH.EMPHDATEFIN, EH.DEPARTEMENT, EH.MACHINE,
          EH.EMPLOYE, EH.EMPHEFFORT_HOMME,
          D.deDescription_P, D.DeDescription_S,
          M.MADESC_P, M.MADESC_S, M.MACODE,
          E.EMNOM
        FROM EMPLOYE_HEURES EH
        INNER JOIN AutoFAB_DEPARTEMENT D ON EH.DEPARTEMENT = D.DESEQ
        INNER JOIN AutoFAB_MACHINE M ON EH.MACHINE = M.MASEQ
        INNER JOIN AutoFAB_EMPLOYE E ON EH.EMPLOYE = E.EMSEQ
        WHERE 0=0
        AND EH.EMPHDATEDEBUT >= @dateDebut
        AND EH.EMPHDATEFIN <= @dateFin
        ${employeeFilter}
        ORDER BY EH.EMPHDATEDEBUT DESC, EH.EMPHDATEFIN DESC
      `);

    const data = result.recordset.map((r) => {
      const start = new Date(r.EMPHDATEDEBUT);
      const end = new Date(r.EMPHDATEFIN);
      const durationMin = Math.round((end - start) / 60000);
      return {
        EHSEQ: r.EMPHSEQ,
        EHDEBUT: r.EMPHDATEDEBUT ? r.EMPHDATEDEBUT.toISOString().replace("T", " ").slice(0, 19) : "",
        EHFIN: r.EMPHDATEFIN ? r.EMPHDATEFIN.toISOString().replace("T", " ").slice(0, 19) : "",
        EHDUREE: durationMin,
        DEPARTEMENT: r.DEPARTEMENT,
        DECODE: r.deDescription_P || "",
        DECODE_S: r.DeDescription_S || "",
        MACHINE: r.MACHINE,
        MACODE: r.MACODE || "",
        MACHINE_P: r.MADESC_P || "",
        MACHINE_S: r.MADESC_S || "",
        EMNOM: r.EMNOM || "",
        EMNOIDENT: r.EMPLOYE,
        EFFORTRATE: (r.EMPHEFFORT_HOMME || 0) * 100,
        HOURSWORKED: Math.round(durationMin * (r.EMPHEFFORT_HOMME || 0)),
      };
    });

    res.json({ success: true, data, message: "Employee hours retrieved" });
  })
);

// ─── GET /getEffortRate.cfm ─────────────────────────────────────────────────
// Exact replica of trouveEffort (operation.cfc:6026-6042)
app.get(
  "/getEffortRate.cfm",
  handler(async (req, res) => {
    const machine = parseInt(req.query.machine, 10) || 0;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("machine", sql.Int, machine)
      .query("SELECT MAEFFORTHOMME FROM MACHINE WHERE MASEQ = @machine");

    const effort = result.recordset.length > 0 ? (result.recordset[0].MAEFFORTHOMME || 0) * 100 : 0;
    res.json({ success: true, data: { effortRate: effort }, message: "Effort rate retrieved" });
  })
);

// ─── POST /addHours.cfm ─────────────────────────────────────────────────────
// Exact replica of ajouteModifieTempsHomme with EMPHSEQ=0 (operation.cfc:5780-5847)
app.post(
  "/addHours.cfm",
  handler(async (req, res) => {
    const { employeeCode, date, startTime, endTime, department, machine, effortRate } = req.body;

    // Construct full datetime strings
    let dateDebut = `${date} ${startTime}`;
    let dateFin = `${date} ${endTime}`;

    // Handle overnight shifts
    const startHour = parseInt(startTime.split(":")[0], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    if (endHour < startHour || (endHour === 0 && startHour > 0)) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFin = `${nextDay.toISOString().slice(0, 10)} ${endTime}`;
    }

    // Duration check
    const diffMs = new Date(dateFin) - new Date(dateDebut);
    const diffMin = diffMs / 60000;
    if (diffMin <= 0) {
      return res.json({ success: false, data: "", error: "Negative or zero duration" });
    }

    const effortDecimal = parseFloat((effortRate / 100).toFixed(2));
    const poolExt = await getPoolExt();

    // Duplicate check (operation.cfc:5799-5808)
    const dupCheck = await poolExt
      .request()
      .input("dateDebut", sql.DateTime, new Date(dateDebut))
      .input("dateFin", sql.DateTime, new Date(dateFin))
      .input("dept", sql.Int, department)
      .input("machine", sql.Int, machine)
      .input("employe", sql.Int, employeeCode)
      .input("effort", sql.Float, effortDecimal)
      .query(`
        SELECT EMPHSEQ FROM EMPLOYE_HEURES
        WHERE EMPHDATEDEBUT = @dateDebut AND EMPHDATEFIN = @dateFin
        AND DEPARTEMENT = @dept AND MACHINE = @machine AND EMPLOYE = @employe
        AND EMPHEFFORT_HOMME = @effort
      `);

    if (dupCheck.recordset.length > 0) {
      return res.json({ success: false, data: "", error: "Duplicate entry" });
    }

    // Insert (operation.cfc:5812-5825)
    const insertResult = await poolExt
      .request()
      .input("dateDebut", sql.DateTime, new Date(dateDebut))
      .input("dateFin", sql.DateTime, new Date(dateFin))
      .input("effort", sql.Float, effortDecimal)
      .input("dept", sql.Int, department)
      .input("machine", sql.Int, machine)
      .input("employe", sql.Int, employeeCode)
      .query(`
        SET NOCOUNT ON
        INSERT INTO EMPLOYE_HEURES (EMPHDATEDEBUT, EMPHDATEFIN, EMPHEFFORT_HOMME, DEPARTEMENT, MACHINE, EMPLOYE)
        VALUES (@dateDebut, @dateFin, @effort, @dept, @machine, @employe)
        SELECT NouvTempsID = @@IDENTITY
        SET NOCOUNT OFF
      `);

    const newId = insertResult.recordset[0]?.NouvTempsID;
    res.json({ success: true, data: { EHSEQ: newId }, message: "Hours added" });
  })
);

// ─── POST /updateEmployeeHours.cfm ──────────────────────────────────────────
// Exact replica of ajouteModifieTempsHomme with EMPHSEQ>0 (operation.cfc:5780-5847)
app.post(
  "/updateEmployeeHours.cfm",
  handler(async (req, res) => {
    const { ehseq, startTime, endTime, department, machine, effortRate } = req.body;

    const dateDebut = startTime.replace("T", " ");
    const dateFin = endTime.replace("T", " ");

    const diffMs = new Date(dateFin) - new Date(dateDebut);
    const diffMin = diffMs / 60000;
    if (diffMin <= 0) {
      return res.json({ success: false, data: "", error: "Negative or zero duration" });
    }

    const effortDecimal = parseFloat((effortRate / 100).toFixed(2));
    const poolExt = await getPoolExt();

    // Get existing row for EMPLOYE value
    const existing = await poolExt
      .request()
      .input("ehseq", sql.Int, ehseq)
      .query("SELECT EMPHSEQ, EMPLOYE FROM EMPLOYE_HEURES WHERE EMPHSEQ = @ehseq");

    if (existing.recordset.length === 0) {
      return res.json({ success: false, data: "", error: "Record not found" });
    }
    const employe = existing.recordset[0].EMPLOYE;

    // Duplicate check
    const dupCheck = await poolExt
      .request()
      .input("dateDebut", sql.DateTime, new Date(dateDebut))
      .input("dateFin", sql.DateTime, new Date(dateFin))
      .input("dept", sql.Int, department)
      .input("machine", sql.Int, machine)
      .input("employe", sql.Int, employe)
      .input("effort", sql.Float, effortDecimal)
      .query(`
        SELECT EMPHSEQ FROM EMPLOYE_HEURES
        WHERE EMPHDATEDEBUT = @dateDebut AND EMPHDATEFIN = @dateFin
        AND DEPARTEMENT = @dept AND MACHINE = @machine AND EMPLOYE = @employe
        AND EMPHEFFORT_HOMME = @effort
      `);

    if (dupCheck.recordset.length > 0) {
      return res.json({ success: false, data: "", error: "Duplicate entry" });
    }

    // Update (operation.cfc:5830-5838)
    await poolExt
      .request()
      .input("dateDebut", sql.DateTime, new Date(dateDebut))
      .input("dateFin", sql.DateTime, new Date(dateFin))
      .input("effort", sql.Float, effortDecimal)
      .input("dept", sql.Int, department)
      .input("machine", sql.Int, machine)
      .input("employe", sql.Int, employe)
      .input("ehseq", sql.Int, ehseq)
      .query(`
        UPDATE EMPLOYE_HEURES
        SET EMPHDATEDEBUT = @dateDebut, EMPHDATEFIN = @dateFin,
            EMPHEFFORT_HOMME = @effort,
            DEPARTEMENT = @dept, MACHINE = @machine, EMPLOYE = @employe
        WHERE EMPHSEQ = @ehseq
      `);

    res.json({ success: true, data: { EHSEQ: ehseq }, message: "Hours updated" });
  })
);

// ─── POST /deleteEmployeeHours.cfm ──────────────────────────────────────────
// Exact replica of retireTempsHomme (operation.cfc:5736-5753)
app.post(
  "/deleteEmployeeHours.cfm",
  handler(async (req, res) => {
    const { ehseq } = req.body;
    const poolExt = await getPoolExt();

    // Verify exists (operation.cfc:5741-5744)
    const existing = await poolExt
      .request()
      .input("ehseq", sql.Int, ehseq)
      .query("SELECT EMPHSEQ FROM EMPLOYE_HEURES WHERE EMPHSEQ = @ehseq");

    // Delete (operation.cfc:5746-5749)
    await poolExt
      .request()
      .input("ehseq", sql.Int, ehseq)
      .query("DELETE FROM EMPLOYE_HEURES WHERE EMPHSEQ = @ehseq");

    const returnId = existing.recordset.length > 0 ? existing.recordset[0].EMPHSEQ : ehseq;
    res.json({ success: true, data: { EHSEQ: returnId }, message: "Entry deleted" });
  })
);

// ─── GET /getVcutComponents.cfm ──────────────────────────────────────────────
// Returns VCUT components for the questionnaire input table.
// Replicates trouveUnTableauVCut + per-component cumulative qty from TRANSAC.
// Also returns VCUT containers from VSP_BonTravail_VeneerReserve for big sheet dropdown.
app.get(
  "/getVcutComponents.cfm",
  handler(async (req, res) => {
    const transac = parseInt(req.query.transac) || 0;
    const nopseq = parseInt(req.query.nopseq) || 0;
    if (!transac) return res.json({ success: false, error: "transac parameter is required" });

    const pool = await getPool();

    // Get VCUT components (replicates trouveUnTableauVCut from operation.cfc:4487-4500)
    const compResult = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT CNOMENCLATURE.NISEQ, CNOMENCLATURE.NIQTE,
          CNOMENCLATURE.INVENTAIRE_M, CNOMENCLATURE.INVENTAIRE_M_INNOINV,
          INVENTAIRE.INDESC1, INVENTAIRE.INDESC2,
          m.cNOM_SEQ AS COPMACHINE, c.NOPSEQ
        FROM CNOMENCLATURE
        LEFT OUTER JOIN INVENTAIRE ON (INVENTAIRE.INSEQ = cNOMENCLATURE.INVENTAIRE_M)
        LEFT JOIN cNOMENCOP c ON CNOMENCLATURE.NISEQ = c.CNomenclature
        LEFT JOIN cNOMENCOP_Machine m ON c.NOPSEQ = m.cNOMENCOP
        WHERE CNOMENCLATURE.TRANSAC = @tr
        AND CNOMENCLATURE.NISEQ_PERE IS NULL
      `);

    // Per-component: cumulative produced qty + default remaining qty
    const components = [];
    for (const comp of compResult.recordset) {
      const cumResult = await pool.request()
        .input("tr", sql.Int, transac)
        .input("invM", sql.Int, comp.INVENTAIRE_M)
        .query(`
          SELECT TOP 1 TRENTQTECUM
          FROM TRANSAC
          WHERE TRANSAC = @tr AND INVENTAIRE = @invM AND TRNO_EQUATE = 5
          ORDER BY TRSEQ DESC
        `);
      // Default qty = NIQTE - SUM(already produced) — matches old software
      // Old: LaQuantite = val(trouveProduits.QUANTITE) - val(QteDejaFait.TOTAL)
      const alreadyResult = await pool.request()
        .input("tr", sql.Int, transac)
        .input("invM", sql.Int, comp.INVENTAIRE_M)
        .input("compNopseq", sql.Int, comp.NOPSEQ || nopseq)
        .query(`
          SELECT ISNULL(SUM(TJQTEPROD), 0) AS TOTAL
          FROM TEMPSPROD
          WHERE TRANSAC = @tr
          AND (INVENTAIRE_C = @invM OR CNOMENCOP = @compNopseq)
          AND CNOMENCOP = @compNopseq
        `);
      const alreadyProduced = alreadyResult.recordset[0]?.TOTAL || 0;
      const defaultQty = Math.max(0, (comp.NIQTE || 0) - alreadyProduced);

      components.push({
        niseq: comp.NISEQ,
        niqte: comp.NIQTE,
        inventaireM: comp.INVENTAIRE_M,
        code: comp.INVENTAIRE_M_INNOINV,
        desc_P: comp.INDESC1,
        desc_S: comp.INDESC2,
        copmachine: comp.COPMACHINE || 0,
        nopseq: comp.NOPSEQ || nopseq,
        cumQty: cumResult.recordset[0]?.TRENTQTECUM || 0,
        defaultQty,
      });
    }

    // VCUT containers from VSP_BonTravail_VeneerReserve (external DB)
    let containers = [];
    try {
      const poolExt = await getPoolExt();
      const contResult = await poolExt.request()
        .input("tr", sql.Int, transac)
        .query(`
          SELECT v.CONTENANT_CON_NUMERO, v.DTRQTE,
            v.ENTREPOT, v.ENTREPOT_ENCODE,
            e.ENDESC_P, e.ENDESC_S
          FROM VSP_BonTravail_VeneerReserve v
          LEFT OUTER JOIN TS_SEATPL.dbo.ENTREPOT e ON v.ENTREPOT = e.ENSEQ
          WHERE v.TRANSAC = @tr
        `);
      containers = contResult.recordset.map(c => ({
        conNumero: c.CONTENANT_CON_NUMERO,
        qty: c.DTRQTE,
        entrepot: c.ENTREPOT,
        entrepotCode: c.ENTREPOT_ENCODE,
        entrepotDesc_P: c.ENDESC_P,
        entrepotDesc_S: c.ENDESC_S,
      }));
    } catch (err) {
      console.warn("[getVcutComponents] Could not fetch VCUT containers:", err.message);
    }

    // Previously produced quantities (from DET_TRANS joined with TEMPSPROD EPF entries)
    const prodResult = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO, DT.DTRQTE,
          T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
          ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE,
          T2.TRNO AS EPF_TRNO
        FROM DET_TRANS DT
        INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
        INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
        OUTER APPLY (
          SELECT DT.DTRQTE_INV + ISNULL((
            SELECT SUM(DTCOR.DTRQTE_INV) FROM DET_TRANS DTCOR
            INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
            WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
          ), 0) DTRQTE_TRANSACTION
        ) DETTRANS
        LEFT JOIN TRANSAC T2 ON T2.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
        WHERE TP.TRANSAC = @tr
        AND TP.MODEPROD_MPCODE = 'PROD'
        AND ISNULL(TP.ENTRERPRODFINI_PFNOTRANS, '') <> ''
      `);

    const producedItems = prodResult.recordset.map(r => ({
      dtrseq: r.DTRSEQ,
      qty: r.QTECORRIGEE || r.DTRQTE,
      container: r.CONTENANT_CON_NUMERO || "",
      code: r.INVENTAIRE_INNOINV,
      desc_P: r.INVENTAIRE_INDESC1,
      desc_S: r.INVENTAIRE_INDESC2,
      epfTrno: r.EPF_TRNO || r.TRANSAC_TRNO,
    }));

    // Get all TJSEQ for this VCUT batch (needed by SM)
    const copmachineParam = parseInt(req.query.copmachine) || 0;
    const allTjseq = await pool.request()
      .input("transac", sql.Int, transac)
      .input("copmachine", sql.Int, copmachineParam)
      .query(`
        SELECT TJSEQ FROM TEMPSPROD
        WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
        AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
        ${copmachineParam ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
      `);
    const listeTjseq = allTjseq.recordset.map(r => r.TJSEQ).join(",");

    // Get all EPF sequences
    const allEpf = await pool.request()
      .input("transac", sql.Int, transac)
      .query(`
        SELECT DISTINCT EPF.PFSEQ
        FROM TEMPSPROD TP
        INNER JOIN ENTRERPRODFINI EPF ON EPF.PFNOTRANS = TP.ENTRERPRODFINI_PFNOTRANS
        WHERE TP.TRANSAC = @transac AND TP.MODEPROD_MPCODE = 'PROD'
        AND ISNULL(TP.ENTRERPRODFINI_PFNOTRANS, '') <> ''
      `);
    const listeEpfSeq = allEpf.recordset.map(r => r.PFSEQ).join(",");

    // Get SMNOTRANS from TEMPSPROD
    const smResult = await pool.request()
      .input("transac", sql.Int, transac)
      .query(`
        SELECT TOP 1 SMNOTRANS FROM TEMPSPROD
        WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
        AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
        ORDER BY TJSEQ DESC
      `);
    const smnotrans = (smResult.recordset[0]?.SMNOTRANS || "").trim();

    res.json({
      success: true,
      data: { components, containers, producedItems, listeTjseq, listeEpfSeq, smnotrans },
    });
  })
);

// ─── POST /addVcutQty.cfm ───────────────────────────────────────────────────
// Exact replica of ProduitFini.cfc → AjouteEPF (VCUT path).
// Uses the AutoFab SOAP API for EXECUTE_TRANSACTION and EXECUTE_STORED_PROC
// calls, matching the old ColdFusion software exactly.
app.post(
  "/addVcutQty.cfm",
  handler(async (req, res) => {
    const { transac, copmachine, nopseq, qty, container, inventaireP, niseq: passedNiseq, mainNopseq, employeeSeq } = req.body;
    if (!transac || !nopseq) return res.json({ success: false, error: "transac and nopseq required" });
    const emseq = Number(employeeSeq) || 0;

    const pool = await getPool();
    const poolExt = await getPoolExt();
    const goodQty = Number(qty) || 0;
    // In old software, arguments.NOPSEQ is the MAIN operation's NOPSEQ (not the component's)
    const theMainNopseq = Number(mainNopseq) || Number(nopseq);

    // ─── Step A: trouveNOPSEQ + trouveTRANSAC (ProduitFini.cfc:1350-1380) ───
    const trouveNOPSEQ = await pool.request()
      .input("transac", sql.Int, transac)
      .input("invP", sql.Int, inventaireP)
      .query(`
        SELECT TOP 1 c.NOPSEQ, v.OPERATION AS Operation, v.NISEQ, v.MACHINE,
          v.NISTR_NIVEAU, v.INVENTAIRE
        FROM CNOMENCOP c
        INNER JOIN VOperationParTransac v ON c.NOPSEQ = v.NOPSEQ
        WHERE c.TRANSAC = @transac AND c.INVENTAIRE_P = @invP
        ORDER BY c.NOPSEQ DESC
      `);

    const trouveTRANSAC = await pool.request()
      .input("transac", sql.Int, transac)
      .input("invP", sql.Int, inventaireP)
      .query(`
        SELECT DISTINCT cn.INVENTAIRE_P, cn.INVENTAIRE_P_INNOINV, cn.INVENTAIRE_P_INDESC1,
          cn.INVENTAIRE_P_INDESC2, t.INVENTAIRE, t.TRITEM, t.FSC, t.ENTREPOT,
          t.TRNOORIGINE, t.TRFACTEURCONV, t.TRNO
        FROM cNOMENCLATURE cn
        INNER JOIN TRANSAC t ON cn.TRANSAC = t.TRSEQ
        WHERE cn.TRANSAC = @transac AND cn.INVENTAIRE_P = @invP
      `);

    // Build ConstruitDonneesLocales equivalents (support.cfc:845-920)
    const transacInfo = await pool.request()
      .input("transac", sql.Int, transac)
      .query(`SELECT TRSEQ, TRNO, TRITEM, INVENTAIRE, ENTREPOT, TRFACTEURCONV, TRNOORIGINE, TRNORELACHE FROM TRANSAC WHERE TRSEQ = @transac`);
    const ti = transacInfo.recordset[0] || {};

    let conotrans = ti.TRNO || "";
    let tritem = ti.TRITEM || 0;
    let trnorelache = ti.TRNORELACHE || 0;
    if (ti.TRNOORIGINE) {
      const orig = await pool.request()
        .input("trno", sql.VarChar(9), String(ti.TRNOORIGINE).substring(0, 9))
        .input("tritem", sql.Int, ti.TRITEM || 0)
        .query(`SELECT TRSEQ, TRNO, TRITEM, TRNORELACHE FROM TRANSAC WHERE TRNO = @trno AND TRITEM = @tritem`);
      if (orig.recordset.length) {
        conotrans = orig.recordset[0].TRNO;
        tritem = orig.recordset[0].TRITEM;
        trnorelache = orig.recordset[0].TRNORELACHE;
      }
    }

    const componentNopseq = trouveNOPSEQ.recordset[0]?.NOPSEQ || nopseq;
    const componentOperation = trouveNOPSEQ.recordset[0]?.Operation || 0;
    const componentNiseq = trouveNOPSEQ.recordset[0]?.NISEQ || passedNiseq || 0;
    const componentMachine = trouveNOPSEQ.recordset[0]?.MACHINE || 0;
    const trfacteurconv = trouveTRANSAC.recordset[0]?.TRFACTEURCONV || 1;

    // ─── Step B: Find or create TEMPSPROD (ProduitFini.cfc:1383-1450) ────────
    // Old software: compares trouveNOPSEQ.NOPSEQ with arguments.NOPSEQ (the MAIN operation NOPSEQ)
    // If they differ, a new TEMPSPROD row is created for this component
    let componentTjseq;
    const nopseqDiffers = componentNopseq !== theMainNopseq;
    console.log(`[addVcutQty] componentNopseq=${componentNopseq} mainNopseq=${theMainNopseq} nopseqDiffers=${nopseqDiffers}`);

    if (nopseqDiffers && trouveNOPSEQ.recordset.length > 0) {
      // Create new TEMPSPROD via Nba_Sp_Insert_Production (ProduitFini.cfc:1392-1423)
      // Using direct mssql call (same as changeStatus route) — proven to work
      const mpResult = await pool.request()
        .query(`SELECT MPSEQ FROM MODEPROD WHERE MPCODE = 'PROD'`);
      const mpseq = mpResult.recordset[0]?.MPSEQ || 1;

      const now = new Date();
      const dateStr = now.toISOString().substring(0, 10); // yyyy-mm-dd
      const timeStr = now.toTimeString().substring(0, 8);  // HH:mm:ss

      const insertReq = pool.request();
      insertReq.input("EMPLOYE", sql.Int, emseq);
      insertReq.input("EMPLOYE_TAUXH", sql.Float, 0);
      insertReq.input("OPERATION", sql.Int, componentOperation);
      insertReq.input("OPERATION_TAUXH", sql.Float, 0);
      insertReq.input("MACHINE", sql.Int, componentMachine);
      insertReq.input("MACHINE_TAUXH", sql.Float, 0);
      insertReq.input("TRSEQ", sql.Int, transac);
      insertReq.input("NO_SERIE", sql.Int, 0);
      insertReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
      insertReq.input("cNOMENCLATURE", sql.Int, componentNiseq);
      insertReq.input("INVENTAIRE_C", sql.Int, inventaireP || 0);
      insertReq.input("TJQTEPROD", sql.Float, 0);
      insertReq.input("TJQTEDEFECT", sql.Float, 0);
      insertReq.input("TJVALIDE", sql.Bit, 1);
      insertReq.input("TJPROD_TERMINE", sql.Bit, 0);
      insertReq.input("StrDateD", sql.Char(10), dateStr);
      insertReq.input("StrHeureD", sql.Char(8), timeStr);
      insertReq.input("StrDateF", sql.Char(10), dateStr);
      insertReq.input("StrHeureF", sql.Char(8), timeStr);
      insertReq.input("MODEPROD", sql.Int, mpseq);
      insertReq.input("TjNote", sql.VarChar(7500), "Ecran de production pour Temps prod: Insertion");
      insertReq.input("LOT_FAB", sql.Int, 0);
      insertReq.input("SMNOTRANS", sql.Char(9), "");
      insertReq.input("CNOMENCOP_MACHINE", sql.Int, copmachine || 0);
      insertReq.output("TJSEQ", sql.Int);
      insertReq.output("ERREUR", sql.Int);
      const insertResult = await insertReq.execute("Nba_Sp_Insert_Production");
      componentTjseq = insertResult.output.TJSEQ || null;
      console.log(`[addVcutQty] Nba_Sp_Insert_Production → TJSEQ=${componentTjseq} ERREUR=${insertResult.output.ERREUR}`);

      if (componentTjseq) {
        // UPDATE TEMPSPROD (ProduitFini.cfc:1424-1433)
        const updateReq = pool.request()
          .input("tjseq", sql.Int, componentTjseq)
          .input("qty", sql.Float, goodQty)
          .input("cnomencop", sql.Int, nopseq)
          .input("invC", sql.Int, inventaireP || 0);
        let updateSql = `UPDATE TEMPSPROD SET TJQTEPROD = @qty, CNOMENCOP = @cnomencop, INVENTAIRE_C = @invC`;
        if (componentNiseq) {
          updateReq.input("niseq", sql.Int, componentNiseq);
          updateSql += `, cNOMENCLATURE = @niseq`;
        }
        updateSql += ` WHERE TJSEQ = @tjseq`;
        await updateReq.query(updateSql);
      }
    } else {
      // Find existing TEMPSPROD (ProduitFini.cfc:1437-1449)
      const existing = await pool.request()
        .input("transac", sql.Int, transac)
        .input("nopseq", sql.Int, nopseq)
        .input("copmachine", sql.Int, copmachine || 0)
        .query(`
          SELECT TOP 1 TJSEQ
          FROM TEMPSPROD
          WHERE TRANSAC = @transac
          AND cNOMENCOP = @nopseq
          AND MODEPROD = 1
          AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
          ${Number(copmachine) ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
          ORDER BY TJSEQ DESC
        `);
      componentTjseq = existing.recordset[0]?.TJSEQ;

      // If still not found, try main PROD row
      if (!componentTjseq) {
        const mainProd = await pool.request()
          .input("transac", sql.Int, transac)
          .input("copmachine", sql.Int, copmachine || 0)
          .query(`
            SELECT TOP 1 TJSEQ FROM TEMPSPROD
            WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
            AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
            ${Number(copmachine) ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
            ORDER BY TJSEQ DESC
          `);
        componentTjseq = mainProd.recordset[0]?.TJSEQ;
      }

      if (componentTjseq) {
        // Update TEMPSPROD with qty (same as nopseq-differs path but without SP)
        await pool.request()
          .input("tjseq", sql.Int, componentTjseq)
          .input("qty", sql.Float, goodQty)
          .input("cnomencop", sql.Int, nopseq)
          .input("invC", sql.Int, inventaireP || 0)
          .query(`UPDATE TEMPSPROD SET TJQTEPROD = @qty, CNOMENCOP = @cnomencop, INVENTAIRE_C = @invC WHERE TJSEQ = @tjseq`);
      }
    }

    if (!componentTjseq) {
      return res.json({ success: false, error: "Could not find or create TEMPSPROD row" });
    }

    // ─── Step C: Create EPF header via AutoFab SOAP (InsertEntreeProduitFini:1882-1906) ─
    // Old software ALWAYS creates a new EPF on each "+" click — no check for existing EPF.
    let pfnotrans = "";
    let epfSeq = 0;

    // Clarion date values (support.cfc:871-873)
    const clarionResult = await pool.request().query(`
      SELECT
        DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
        DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion
    `);
    const { LaDateClarion, LaHeureClarion } = clarionResult.recordset[0];

    // EXECUTE_TRANSACTION EPF/INS (ProduitFini.cfc:1882-1892)
    const epfParams = `'';${LaDateClarion};${LaHeureClarion};'WebUI New';'0';'Ecran de production pour EPF';`;
    console.log(`[addVcutQty] EPF/INS params: ${epfParams}`);
    const epfResult = await callAutofab("EXECUTE_TRANSACTION", epfParams, "EPF", "INS");
    epfSeq = Number(epfResult.retval) || 0;
    console.log(`[addVcutQty] EPF/INS → PFSEQ=${epfSeq}`);

    if (epfSeq > 0) {
      // Get PFNOTRANS (ProduitFini.cfc:1902-1905)
      const pfResult = await pool.request()
        .input("pfseq", sql.Int, epfSeq)
        .query(`SELECT PFNOTRANS FROM ENTRERPRODFINI WHERE PFSEQ = @pfseq`);
      pfnotrans = (pfResult.recordset[0]?.PFNOTRANS || "").trim();
    }

    // ─── Step D: Create EPF details via AutoFab SOAP (InsertDetailsEntreeProduitFini:1909-2024) ─
    if (pfnotrans && epfSeq > 0) {
      // Get NISEQ for VCUT (ProduitFini.cfc:1948-1958)
      const vcutNiseq = await pool.request()
        .input("transac", sql.Int, transac)
        .input("invP", sql.Int, inventaireP)
        .query(`
          SELECT NISEQ FROM VOperationParTransac
          WHERE TRANSAC = @transac AND NOPSEQ IN (
            SELECT NOPSEQ FROM CNOMENCOP
            WHERE TRANSAC = @transac AND INVENTAIRE_P = @invP
          )
        `);
      const epfNiseq = vcutNiseq.recordset[0]?.NISEQ || componentNiseq || "";

      // Get machine entrepot (ProduitFini.cfc:1968-1977)
      const machResult = await pool.request()
        .input("maseq", sql.Int, componentMachine)
        .query(`SELECT ENTREPOT FROM MACHINE WHERE MASEQ = @maseq`);
      const epfEntrepot = machResult.recordset[0]?.ENTREPOT || 1;

      // EPFDETAIL/INS call 1: DtrSeq=0 (ProduitFini.cfc:1461-1474)
      // Params: '{TrSeq}';{DtrSeq};{EpfSeq};{Inventaire};{Entrepot};{NiSeq};{CONOTRANS};{TRITEM};{Qte};;'{sNo_serie}';;'{TRNORELACHE}';
      const epfDetailParams1 = `'';0;${epfSeq};${inventaireP};${epfEntrepot};${epfNiseq};${conotrans};${tritem};${goodQty};;'';;'${trnorelache}';`;
      console.log(`[addVcutQty] EPFDETAIL/INS (DtrSeq=0): ${epfDetailParams1}`);
      const detail1 = await callAutofab("EXECUTE_TRANSACTION", epfDetailParams1, "EPFDETAIL", "INS");
      const epfTrSeq = Number(detail1.retval) || 0;
      console.log(`[addVcutQty] EPFDETAIL/INS (0) → TrSeq=${epfTrSeq}`);

      // EPFDETAIL/INS call 2: DtrSeq=-1 (ProduitFini.cfc:1477-1490)
      if (epfTrSeq > 0) {
        const epfDetailParams2 = `'${epfTrSeq}';-1;${epfSeq};${inventaireP};${epfEntrepot};${epfNiseq};${conotrans};${tritem};${goodQty};;'';;'${trnorelache}';`;
        console.log(`[addVcutQty] EPFDETAIL/INS (DtrSeq=-1): ${epfDetailParams2}`);
        const detail2 = await callAutofab("EXECUTE_TRANSACTION", epfDetailParams2, "EPFDETAIL", "INS");
        const epfDtrSeq = Number(detail2.retval) || 0;
        console.log(`[addVcutQty] EPFDETAIL/INS (-1) → DtrSeq=${epfDtrSeq}`);
      }
    }

    // ─── Step E: Update TEMPSPROD with EPF (ProduitFini.cfc:1505-1513) ───────
    if (pfnotrans) {
      const updateReq = pool.request()
        .input("tjseq", sql.Int, componentTjseq)
        .input("pfno", sql.VarChar(9), pfnotrans.substring(0, 9))
        .input("qty", sql.Float, goodQty);
      let updateSql = `UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS = @pfno, TJQTEPROD = @qty`;
      if (componentNiseq) {
        updateReq.input("niseq", sql.Int, componentNiseq);
        updateSql += `, cNOMENCLATURE = @niseq`;
      }
      updateSql += ` WHERE TJSEQ = @tjseq`;
      await updateReq.query(updateSql);
    }

    // ─── Step F: Container creation (ProduitFini.cfc:1516-1628) ──────────────
    let containerStr = String(container || "").padStart(10, "0").substring(0, 10);
    let conSeq = 0;

    // Check if company uses containers
    const paraContenant = await pool.request()
      .query(`SELECT PCIVALEUR FROM PARA_CIE WHERE PCICODE LIKE '%UTILISE_MODULE_CONTENANT%'`);
    const usesContainers = paraContenant.recordset.length > 0 && Number(paraContenant.recordset[0]?.PCIVALEUR) === 1;

    if (usesContainers && pfnotrans) {
      // Find existing container (ProduitFini.cfc:1524-1529)
      const conResult = await pool.request()
        .input("connum", sql.VarChar(10), containerStr)
        .query(`SELECT CON_SEQ, CON_NUMERO FROM CONTENANT WHERE CON_NUMERO = @connum AND CON_NUMERO <> ''`);

      if (conResult.recordset.length) {
        conSeq = conResult.recordset[0].CON_SEQ;
      } else {
        // Container doesn't exist — always create one (ProduitFini.cfc:1531-1543)
        // Old software: even when user leaves container blank, it auto-generates a new number
        let conNumero = containerStr;
        const seqResult = await pool.request()
          .query(`SELECT LaSequence FROM TableSequence WHERE NomSequence = 'CONTENANT'`);
        if (seqResult.recordset.length) {
          const newSeq = Number(seqResult.recordset[0].LaSequence) + 1;
          await pool.request()
            .input("newSeq", sql.Int, newSeq)
            .query(`UPDATE TableSequence SET LaSequence = @newSeq WHERE NomSequence = 'CONTENANT'`);
          conNumero = String(newSeq).padStart(10, "0");
        }

        // Get machine entrepot and default material status
        const machResult2 = await pool.request()
          .input("maseq", sql.Int, componentMachine)
          .query(`SELECT ENTREPOT FROM MACHINE WHERE MASEQ = @maseq`);
        const leEntrepot = machResult2.recordset[0]?.ENTREPOT || 1;

        const stmResult = await pool.request()
          .query(`SELECT STM_SEQ FROM STATUT_MATERIEL WHERE STM_DEFAUT_PROD = 1`);
        const stmSeq = stmResult.recordset[0]?.STM_SEQ || 0;

        // Nba_Insert_Contenant via AutoFab (ProduitFini.cfc:1599-1609)
        const conParams = `22,${stmSeq},${leEntrepot},'${conNumero}',1`;
        console.log(`[addVcutQty] Nba_Insert_Contenant: ${conParams}`);
        const conSoapResult = await callAutofab("EXECUTE_STORED_PROC", conParams, "Nba_Insert_Contenant", "0");
        conSeq = Number(conSoapResult.OutputValues?.CON_SEQ) || 0;
        // Update containerStr to the NEW auto-generated container number
        containerStr = conNumero;
        console.log(`[addVcutQty] Nba_Insert_Contenant → CON_SEQ=${conSeq} CON_NUMERO=${containerStr}`);
      }

      // ─── Step G: Create/update DET_TRANS (ProduitFini.cfc:1650-1696) ─────
      if (pfnotrans) {
        // Find EPF TRANSAC
        const epfTrResult = await pool.request()
          .input("pfno", sql.VarChar(9), pfnotrans.substring(0, 9))
          .query(`SELECT TRSEQ FROM TRANSAC WHERE TRNO = @pfno`);

        if (epfTrResult.recordset.length) {
          const epfTrseq = epfTrResult.recordset[0].TRSEQ;

          // Check if DET_TRANS exists
          const existingDt = await pool.request()
            .input("trseq", sql.Int, epfTrseq)
            .query(`SELECT DTRSEQ FROM DET_TRANS WHERE TRANSAC = @trseq`);

          const machEnt = await pool.request()
            .input("maseq", sql.Int, componentMachine)
            .query(`SELECT ENTREPOT FROM MACHINE WHERE MASEQ = @maseq`);
          const leEntrepotDt = machEnt.recordset[0]?.ENTREPOT || 1;

          if (!existingDt.recordset.length) {
            // Nba_Insert_Det_Trans_Avec_Contenant via AutoFab (ProduitFini.cfc:1661)
            const dtParams = `${epfTrseq},${inventaireP},'',${leEntrepotDt},${goodQty},${trfacteurconv},${conSeq},'WebUI New'`;
            console.log(`[addVcutQty] Nba_Insert_Det_Trans_Avec_Contenant: ${dtParams}`);
            const dtResult = await callAutofab("EXECUTE_STORED_PROC", dtParams, "Nba_Insert_Det_Trans_Avec_Contenant", "0");
            console.log(`[addVcutQty] Nba_Insert_Det_Trans_Avec_Contenant → DTRSEQ=${dtResult.OutputValues?.DTRSEQ}`);
          } else {
            // Update existing DET_TRANS (ProduitFini.cfc:1698-1714)
            const facteur = trfacteurconv || 1;
            const dtrqte = goodQty / facteur;
            // Find container seq from conNumero
            const conLookup = await pool.request()
              .input("connum", sql.VarChar(10), containerStr)
              .query(`SELECT CON_SEQ FROM CONTENANT WHERE CON_NUMERO = @connum`);
            const conSeqUpdate = conLookup.recordset[0]?.CON_SEQ || conSeq;

            await pool.request()
              .input("dtrseq", sql.Int, existingDt.recordset[0].DTRSEQ)
              .input("dtrqte", sql.Float, dtrqte)
              .input("dtrqteuninv", sql.Float, goodQty)
              .input("con", sql.Int, conSeqUpdate)
              .input("connum", sql.VarChar(10), containerStr)
              .query(`UPDATE DET_TRANS SET DTRQTE = @dtrqte, DTRQTEUNINV = @dtrqteuninv, CONTENANT = @con, CONTENANT_CON_NUMERO = @connum WHERE DTRSEQ = @dtrseq`);
          }

          // Update TRANSAC quantities (ProduitFini.cfc:1691-1696)
          await pool.request()
            .input("trseq", sql.Int, epfTrseq)
            .input("qty", sql.Float, goodQty)
            .query(`UPDATE TRANSAC SET TRQTETRANSAC = @qty, TRQTEUNINV = @qty WHERE TRSEQ = @trseq`);
        }
      }
    }

    // ─── Step H: Fetch updated produced items ────────────────────────────────
    const prodItems = await pool.request()
      .input("tr", sql.Int, transac)
      .query(`
        SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO, DT.DTRQTE,
          T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
          ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE, T2.TRNO AS EPF_TRNO
        FROM DET_TRANS DT
        INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
        INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
        OUTER APPLY (
          SELECT DT.DTRQTE_INV + ISNULL((
            SELECT SUM(DTCOR.DTRQTE_INV) FROM DET_TRANS DTCOR
            INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
            WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
          ), 0) DTRQTE_TRANSACTION
        ) DETTRANS
        LEFT JOIN TRANSAC T2 ON T2.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
        WHERE TP.TRANSAC = @tr AND TP.MODEPROD_MPCODE = 'PROD'
        AND ISNULL(TP.ENTRERPRODFINI_PFNOTRANS, '') <> ''
      `);

    const producedItems = prodItems.recordset.map(r => ({
      dtrseq: r.DTRSEQ, qty: r.QTECORRIGEE || r.DTRQTE,
      container: r.CONTENANT_CON_NUMERO || "", code: r.INVENTAIRE_INNOINV,
      desc_P: r.INVENTAIRE_INDESC1, desc_S: r.INVENTAIRE_INDESC2,
      epfTrno: r.EPF_TRNO || r.TRANSAC_TRNO,
    }));

    // Get all TJSEQ for this VCUT batch (needed by SM calculation)
    const allTjseq = await pool.request()
      .input("transac", sql.Int, transac)
      .input("copmachine", sql.Int, copmachine || 0)
      .query(`
        SELECT TJSEQ FROM TEMPSPROD
        WHERE TRANSAC = @transac AND MODEPROD_MPCODE = 'PROD'
        AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
        ${Number(copmachine) ? "AND cNOMENCOP_MACHINE = @copmachine" : ""}
      `);
    const listeTjseq = allTjseq.recordset.map(r => r.TJSEQ).join(",");

    // Get all EPF sequences for this VCUT batch (needed for posting on submit)
    const allEpf = await pool.request()
      .input("transac", sql.Int, transac)
      .query(`
        SELECT DISTINCT EPF.PFSEQ
        FROM TEMPSPROD TP
        INNER JOIN ENTRERPRODFINI EPF ON EPF.PFNOTRANS = TP.ENTRERPRODFINI_PFNOTRANS
        WHERE TP.TRANSAC = @transac AND TP.MODEPROD_MPCODE = 'PROD'
        AND ISNULL(TP.ENTRERPRODFINI_PFNOTRANS, '') <> ''
      `);
    const listeEpfSeq = allEpf.recordset.map(r => r.PFSEQ).join(",");

    res.json({
      success: true,
      data: { producedItems, tjseq: componentTjseq, listeTjseq, listeEpfSeq },
    });
  })
);

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] Connecting to SQL Server: SEAFAB (Windows Auth)`);
  console.log(`[api] Databases: TS_SEATPL / TS_SEATPL_EXT`);
});
