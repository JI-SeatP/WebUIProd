const express = require("express");
const cors = require("cors");
const { sql, getPool, getPoolExt } = require("./db.cjs");

const app = express();
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
        v.NO_PROD, v.NOM_CLIENT, v.CODE_CLIENT, v.CONOPO,
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
        VBE.PCS_PER_PANEL, VBE.SHARE_PRESSING, VBE.PAGE_COMPO, VBE.Panel_NiSeq
      FROM vEcransProduction v
      INNER JOIN AUTOFAB_DET_COMM dc ON v.TRANSAC = dc.TRANSAC
      LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = v.TRANSAC
      ${where}
      ORDER BY dc.DCPRIORITE, v.NO_PROD, v.DATE_DEBUT_PREVU
    `);

    res.json({
      success: true,
      data: result.recordset,
      message: `Retrieved ${result.recordset.length} work orders`,
    });
  })
);

// ─── GET /getOperation.cfm ───────────────────────────────────────────────────
// Uses the vEcransProduction view directly (same as old software) to ensure
// product, panel, material, and all computed fields match exactly.
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

    // Main query: use the view directly from EXT database (same structure as old software)
    const poolExt = await getPoolExt();
    const mainReq = poolExt.request().input("transac", sql.Int, transac);

    let mainWhere = `WHERE v.TRANSAC = @transac AND v.OPERATION <> 'FINSH'`;
    if (copmachine) {
      mainReq.input("copmachine", sql.Int, copmachine);
      mainWhere += ` AND v.COPMACHINE = @copmachine`;
    }

    const result = await mainReq.query(`
      SELECT TOP 1
        v.DATE_DEBUT_PREVU, v.DATE_FIN_PREVU, v.PR_DEBUTE, v.PR_TERMINE,
        v.NO_PROD, v.NOM_CLIENT, v.CODE_CLIENT, v.CONOPO,
        v.INVENTAIRE_SEQ, v.NO_INVENTAIRE, v.INVENTAIRE_P, v.INVENTAIRE_S, v.REVISION,
        v.MATERIEL_SEQ, v.MATERIEL_CODE, v.MATERIEL_P, v.MATERIEL_S,
        v.PRODUIT_SEQ, v.PRODUIT_CODE, v.PRODUIT_P, v.PRODUIT_S,
        v.KIT_SEQ,
        v.INVENTAIRE_VCUT, v.VCUT_INNOINV, v.VCUT_INDESC1, v.VCUT_INDESC2,
        v.OPERATION_SEQ, v.OPERATION, v.OPERATION_P, v.OPERATION_S,
        v.OrdreRecette AS ORDRERECETTE,
        v.TAUXHORAIREOPERATION,
        v.CNOMENCLATURE, v.CNOM_QTE,
        v.QTE_PAR_EMBAL, v.QTE_PAR_CONT,
        v.NIQTE,
        v.QTE_A_FAB, v.QTE_PRODUITE, v.QTE_RESTANTE, v.QTE_FORCEE, v.QTY_REQ,
        v.MACHINE, v.MACODE, v.MACHINE_P, v.MACHINE_S,
        v.UNITE_P, v.UNITE_S,
        v.TRANSAC, v.NOPSEQ, v.COPMACHINE,
        v.Panneau,
        v.PPINNOINV,
        v.FMCODE, v.FAMILLEMACHINE,
        v.STATUT_CODE, v.STATUT_P, v.STATUT_S,
        v.TJFINDATE, v.TERMINE, v.TJSEQ,
        v.DESEQ, v.DECODE, v.DeDescription_P, v.DeDescription_S,
        v.DCPRIORITE, v.ESTKIT, v.TYPEPRODUIT,
        v.DEPARTEMENT,
        v.TREPOSTER_TRANSFERT,
        T.TRNOTE,
        -- VBE fields
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
        -- Function calls (EXT)
        DBO.AUTOFAB_FctSelectVarCompo(v.TRANSAC, v.CNOMENCLATURE, '@MOLD_TYPE@') AS MOULE_TYPE,
        DBO.AUTOFAB_FctSelectVarCompo(v.TRANSAC, v.CNOMENCLATURE, '@TIME_PR_PRESSING@') AS PRESSAGE_PRESSAGE,
        DBO.AUTOFAB_FctSelectVarCompo(v.TRANSAC, v.CNOMENCLATURE, '@TIME_PR_TEST_PR@') AS PRESSAGE_TEST_APRES,
        DBO.AUTOFAB_FctSelectVarCompo(v.TRANSAC, v.CNOMENCLATURE, '@PRESS_NOTE@') AS PRESSAGE_NOTE,
        -- Scrap qty
        (SELECT SUM(TP.TJQTEDEFECT) FROM AUTOFAB_TEMPSPROD TP WHERE TP.TRANSAC = v.TRANSAC AND TP.CNOMENCOP = v.NOPSEQ) AS NOPQTESCRAP
      FROM vEcransProduction v
      LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = v.TRANSAC
      LEFT OUTER JOIN AUTOFAB_TRANSAC T ON T.TRSEQ = v.TRANSAC
      ${mainWhere}
    `);

    if (!result.recordset.length) {
      return res.json({
        success: false,
        error: `Operation not found for transac=${transac} copmachine=${copmachine}`,
      });
    }

    const row = result.recordset[0];

    // DEBUG: log panel warning fields
    console.log(`[getOperation] TRANSAC=${row.TRANSAC} PANEL_SOURCE=${JSON.stringify(row.PANEL_SOURCE)} PV_PANEAU=${JSON.stringify(row.PV_PANEAU)}`);

    // Primary pool for supplementary queries (next step, instructions — tables without AUTOFAB_ prefix)
    const pool = await getPool();

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
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT RRSEQ AS id, RRCODE AS code, RRDESC_P AS description_P, RRDESC_S AS description_S, RRTYPE AS type
      FROM RAISON
      WHERE RRTYPE LIKE '%14%'
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
                 cn.NIEPAISSEUR AS THICKNESS
          FROM cNOMENCLATURE cn
          LEFT JOIN CRITERE_INV CI ON CI.INVENTAIRE = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV ON INV.INSEQ = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV_P ON INV_P.INSEQ = cn.INVENTAIRE_P
          WHERE cn.NISEQ = @panelNiSeq
        `);
      if (detailResult.recordset.length) {
        const raw = detailResult.recordset[0];
        panelDetail = {
          ...raw,
          THICKNESS: raw.THICKNESS != null && raw.THICKNESS > 0
            ? decimalToFraction(raw.THICKNESS)
            : null,
        };
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
    } = req.body;

    const pool = await getPool();
    const isStop = type === "stop";
    const isComp = type === "comp";
    const qteBonne = Number(goodQty) || 0;
    const qteDefect = (defects || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);

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
        AND UPPER(TP.MODEPROD_MPCODE) = 'PROD'
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
    const tjseq = tp.TJSEQ;
    const nopseq = tp.NOPSEQ || tp.CNOMENCOP;

    console.log(`[submitQuestionnaire] TJSEQ=${tjseq} type=${type} good=${qteBonne} defect=${qteDefect} transac=${transac} copmachine=${copmachine} mpcode=${tp.MODEPROD_MPCODE}`);

    // ── STEP 1: Reset TJPROD_TERMINE flag (line 686)
    await pool.request()
      .input("transac", sql.Int, transac)
      .input("nopseq", sql.Int, nopseq)
      .query(`
        UPDATE TEMPSPROD
        SET TJPROD_TERMINE = 0
        WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq AND TJPROD_TERMINE = 1
      `);

    // ── STEP 2: Update employee on the TEMPSPROD record (line 700)
    let employeeSeq = tp.EMPLOYE || 0;
    if (employeeCode) {
      const empResult = await pool.request()
        .input("emnoident", sql.VarChar(20), String(employeeCode))
        .query(`SELECT EMSEQ, EMNO, EMNOM FROM EMPLOYE WHERE EMNOIDENT = @emnoident`);
      if (empResult.recordset.length) {
        const emp = empResult.recordset[0];
        employeeSeq = emp.EMSEQ;
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

    // ── STEP 3: Record stop causes in TEMPSPRODEX (line 732)
    if (isStop && primaryCause) {
      const existsResult = await pool.request()
        .input("tjseq", sql.Int, tjseq)
        .query(`SELECT TEMPSPROD FROM TEMPSPRODEX WHERE TEMPSPROD = @tjseq`);
      if (existsResult.recordset.length) {
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
          .input("causeP", sql.Int, Number(primaryCause))
          .input("causeS", sql.Int, Number(secondaryCause) || 0)
          .input("note", sql.VarChar(500), notes || "")
          .query(`UPDATE TEMPSPRODEX SET QA_CAUSEP = @causeP, QA_CAUSES = @causeS, EXTPRD_NOTE = @note WHERE TEMPSPROD = @tjseq`);
      } else {
        await pool.request()
          .input("tjseq", sql.Int, tjseq)
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

    // ── STEP 4: Update quantities in TEMPSPROD (line 1670)
    await pool.request()
      .input("tjseq", sql.Int, tjseq)
      .input("qteBonne", sql.Float, qteBonne)
      .input("qteDefect", sql.Float, qteDefect)
      .query(`UPDATE TEMPSPROD SET TJQTEPROD = @qteBonne, TJQTEDEFECT = @qteDefect WHERE TJSEQ = @tjseq`);

    // ── STEP 5: Insert DET_DEFECT records for each defect row
    if (defects && defects.length > 0) {
      for (const d of defects) {
        const dQty = Number(d.qty) || 0;
        if (dQty <= 0 || !d.typeId) continue;
        await pool.request()
          .input("tempsprod", sql.Int, tjseq)
          .input("raison", sql.Int, Number(d.typeId))
          .input("qty", sql.Float, dQty)
          .query(`INSERT INTO DET_DEFECT (TEMPSPROD, RAISON, DDQTEUNINV, DDDATE) VALUES (@tempsprod, @raison, @qty, GETDATE())`);
      }
    }

    // ── STEP 5b: Create Sortie Matériel if quantities > 0 (mirrors ajouteSM + calculeQteSMQS)
    // This creates the SM transaction, links it to TEMPSPROD, and calculates material quantities
    const totalQte = qteBonne + qteDefect;
    if (totalQte > 0) {
      try {
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
          const nistrNiveau = nistrResult.recordset[0]?.NISTR_NIVEAU || "";
          const tritem = smData.TRITEM || 0;
          const conotrans = (smData.CONOTRANS || "").substring(0, 9);
          const trnorelache = smData.TRNORELACHE || 0;

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
            insertSmReq.input("SMQTEPRODUIT", sql.Float, totalQte);
            insertSmReq.input("USER", sql.VarChar(30), "WebUI New");
            insertSmReq.input("SMNOSERIE", sql.VarChar(20), "");
            insertSmReq.input("SMNOTE", sql.VarChar(7500), "Ecran de production pour SM");
            insertSmReq.input("LOT_FAB", sql.Int, 0);
            insertSmReq.input("SMNORELACHE", sql.Int, 0);
            insertSmReq.output("NEWSMNOTRANS", sql.Char(9));
            insertSmReq.output("SQLERREUR", sql.Int);

            const insertSmResult = await insertSmReq.execute("Nba_Sp_Insert_Sortie_Materiel");
            smnotrans = (insertSmResult.output.NEWSMNOTRANS || "").trim();
            console.log(`[submitQuestionnaire] Nba_Sp_Insert_Sortie_Materiel → SMNOTRANS=${smnotrans} err=${insertSmResult.output.SQLERREUR}`);
          }

          if (smnotrans) {
            // Call Nba_Sp_Sortie_Materiel to create DET_TRANS detail lines
            const smReq = pool.request();
            smReq.input("SMNOTRANS", sql.Char(9), smnotrans.substring(0, 9));
            smReq.input("SMITEM", sql.Int, tritem);
            smReq.input("SMNOORIGINE", sql.Char(9), conotrans);
            smReq.input("SMQTEPRODUIT", sql.Float, totalQte);
            smReq.input("OPERATION", sql.Int, tp.OPERATION);
            smReq.input("USER", sql.VarChar(30), "WebUI New");
            smReq.input("NISTR_NIVEAU", sql.VarChar(500), nistrNiveau);
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
            // For non-VCUT: NouvelleQte = ABS(totalQte * NIQTE)
            const detTransResult = await pool.request()
              .input("smnotrans", sql.VarChar(9), smnotrans.substring(0, 9))
              .query(`
                SELECT DT.DTRSEQ, DT.TRANSAC, DT.ENTREPOT, DT.CONTENANT,
                       T.INVENTAIRE AS T_INVENTAIRE
                FROM DET_TRANS DT
                INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
                WHERE DT.TRANSAC_TRNO = @smnotrans
              `);

            for (const dt of detTransResult.recordset) {
              // Get BOM ratio for this material
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

              const nouvelleQte = Math.abs(totalQte * niqte);

              // Update via Nba_Insert_Det_Trans_Avec_Contenant
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

            // Report/Post the SM transaction via Nba_ReporteUnTransac
            // This sets TRPOSTER = 1 on the TRANSAC row (equivalent of EXECUTE_TRANSACTION SM/REPORT)
            const smTrseqResult = await pool.request()
              .input("smno", sql.VarChar(9), smnotrans.substring(0, 9))
              .query(`SELECT TRSEQ FROM TRANSAC WHERE TRNO = @smno`);
            if (smTrseqResult.recordset.length) {
              const smTrseq = smTrseqResult.recordset[0].TRSEQ;
              const reportReq = pool.request();
              reportReq.input("pTrSeq", sql.Int, smTrseq);
              reportReq.input("LaDate", sql.Char(10), dateNow);
              reportReq.input("LHeure", sql.Char(8), timeNow);
              reportReq.input("DTRORDRE_REPORT", sql.Int, 0);
              reportReq.output("DTRORDRE_REPORT_OUT", sql.Int);
              reportReq.output("SQLERREUR", sql.Int);
              reportReq.output("ERROR", sql.Int);
              const reportResult = await reportReq.execute("Nba_ReporteUnTransac");
              console.log(`[submitQuestionnaire] Nba_ReporteUnTransac TRSEQ=${smTrseq} err=${reportResult.output.ERROR}`);
            }

            console.log(`[submitQuestionnaire] SM creation + posting complete: ${smnotrans}, ${detTransResult.recordset.length} materials updated`);
          }
        }
      } catch (err) {
        console.warn("[submitQuestionnaire] SM creation skipped:", err.message);
      }
    }

    // ── STEP 6: Close PROD row via Nba_Sp_Update_Production (same SP as old software)
    // Get original start date/time from the PROD row
    const startDt = new Date(tp.TJDEBUTDATE);
    const startDateStr = `${startDt.getFullYear()}-${String(startDt.getMonth() + 1).padStart(2, "0")}-${String(startDt.getDate()).padStart(2, "0")}`;
    const startTimeStr = `${String(startDt.getHours()).padStart(2, "0")}:${String(startDt.getMinutes()).padStart(2, "0")}:${String(startDt.getSeconds()).padStart(2, "0")}`;

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
    updateReq.input("SMNOTRANS", sql.Char(9), (tp.SMNOTRANS || "").substring(0, 9));
    updateReq.output("ERREUR", sql.Int);
    const updateResult = await updateReq.execute("Nba_Sp_Update_Production");
    console.log(`[submitQuestionnaire] Nba_Sp_Update_Production TJSEQ=${tjseq} err=${updateResult.output.ERREUR}`);

    // ── STEP 7: Recalculate costs via FctCalculTempsDeProduction (line 1702)
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
      data: { transac, type, tjseq },
      message: `Questionnaire submitted — ${type.toUpperCase()} recorded`,
    });
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
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
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
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

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
             v.TAUXHORAIREOPERATION, v.NO_INVENTAIRE
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
      .input("newMpcode", sql.VarChar(10), mpcode);
    let tpWhere = `WHERE TRANSAC = @transac2 AND MODEPROD_MPCODE <> @newMpcode
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

    if (tpResult.recordset.length > 0) {
      // --- EXISTING ROW FOUND: close it with Nba_Sp_Update_Production, then insert new ---
      const prev = tpResult.recordset[0];
      const prevDate = new Date(prev.TJDEBUTDATE);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
      const prevTimeStr = `${String(prevDate.getHours()).padStart(2, "0")}:${String(prevDate.getMinutes()).padStart(2, "0")}:${String(prevDate.getSeconds()).padStart(2, "0")}`;

      // Close previous row — param names must match SP signature exactly
      const updateReq = pool.request();
      updateReq.input("TJSEQ", sql.Int, prev.TJSEQ);
      updateReq.input("EMPLOYE", sql.Int, prev.EMPLOYE);
      updateReq.input("OPERATION", sql.Int, prev.OPERATION || op.OPERATION_SEQ);
      updateReq.input("MACHINE", sql.Int, prev.MACHINE || op.MACHINE);
      updateReq.input("TRSEQ", sql.Int, transac);
      updateReq.input("NO_SERIE", sql.Int, 0);
      updateReq.input("NO_SERIE_NSNO_SERIE", sql.VarChar(20), "");
      updateReq.input("cNOMENCLATURE", sql.Int, prev.cNOMENCLATURE || op.CNOMENCLATURE || 0);
      updateReq.input("INVENTAIRE_C", sql.Int, prev.INVENTAIRE_C || op.INVENTAIRE_SEQ || 0);
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
    insertReq.input("OPERATION_TAUXH", sql.Float, op.TAUXHORAIREOPERATION || 0);
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
    insertReq.input("StrDateF", sql.Char(10), "");
    insertReq.input("StrHeureF", sql.Char(8), "");
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
      const isVcut = op.NO_INVENTAIRE === "VCUT";
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
          if (setupCheck.recordset.length && setupCheck.recordset[0].NOPTEMPSETUP > 0) {
            const setupRow = await pool.request()
              .input("transac", sql.Int, transac)
              .input("nopseq", sql.Int, op.NOPSEQ)
              .query(`
                SELECT TOP 1 TJSEQ FROM TEMPSPROD
                WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
                  AND MODEPROD_MPCODE = 'Setup'
                  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
                ORDER BY TJSEQ DESC
              `);
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

    const materials = matResult.recordset.map((m) => ({
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
        T.CNOMENCOP,
        D.DECODE, D.DEDESCRIPTION_P, D.DEDESCRIPTION_S,
        M.DEPARTEMENT,
        dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) AS NO_PROD,
        I.INDESC1, I.INDESC2,
        CASE WHEN T.ENTRERPRODFINI_PFNOTRANS IS NOT NULL AND T.ENTRERPRODFINI_PFNOTRANS > 0 THEN 1 ELSE 0 END AS ENTREPF
      FROM TEMPSPROD T
      INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
      INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
      LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
      WHERE T.TJSEQ = @tjseq
    `);

    if (!mainResult.recordset.length) {
      return res.json({ success: false, error: "TEMPSPROD record not found" });
    }

    const r = mainResult.recordset[0];

    const fmtDate = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
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
    const [defectsResult, fpResult, materialsResult] = await Promise.all([
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
      pool.request().input("tjseq", sql.Int, tjseqInt).query(`
        SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO,
               DT.DTRQTE, DT.DTRQTECUM_CONT, DT.NO_SERIE_NSNO_SERIE,
               DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
               DT.ENTREPOT_ENCODE_SO, DT.ENTREPOT_ENDESC_P_SO, DT.ENTREPOT_ENDESC_S_SO,
               T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
               T.UNITE_INV_UNDESC1, T.UNITE_INV_UNDESC2,
               ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE
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
      ENTREPF: r.ENTREPF,
      QTE_BONNE: r.TJQTEPROD || 0,
      QTE_DEFAUT: r.TJQTEDEFECT || 0,
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
    const { tjseq, goodQty, defects, newDefects, finishedProducts } = req.body;

    if (!tjseq) {
      return res.json({ success: false, error: "tjseq is required" });
    }

    const pool = await getPool();
    const totalDefect = (defects || []).reduce((sum, d) => sum + (d.correctedQty || 0), 0)
      + (newDefects || []).reduce((sum, d) => sum + (d.qty || 0), 0);

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
        corrReq.input("DTRSEQ", sql.Int, fp.id);
        corrReq.input("DTRQTE_CORRECTION", sql.Float, fp.correctedQty);
        corrReq.input("USAGER", sql.VarChar(50), "WebUI Correction");
        corrReq.output("ERREUR", sql.Int);
        corrReq.output("MSG_EQUATE", sql.VarChar(255));
        const corrResult = await corrReq.execute("Nba_Corrige_Quantite_Transaction");
        console.log(`[submitCorrection] Nba_Corrige_Quantite_Transaction FP DTRSEQ=${fp.id} err=${corrResult.output.ERREUR}`);
      }
    }

    // ── STEP 2: Update existing defect quantities
    if (defects && defects.length > 0) {
      for (const d of defects) {
        await pool.request()
          .input("ddseq", sql.Int, d.id)
          .input("qty", sql.Float, d.correctedQty)
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
    const dateTimeResult = await pool.request().query(`
      SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS dateNow, FORMAT(GETDATE(), 'HH:mm:ss') AS timeNow
    `);
    const { dateNow, timeNow } = dateTimeResult.recordset[0];
    const startDt = new Date(tp.TJDEBUTDATE);
    const startDateStr = `${startDt.getFullYear()}-${String(startDt.getMonth() + 1).padStart(2, "0")}-${String(startDt.getDate()).padStart(2, "0")}`;
    const startTimeStr = `${String(startDt.getHours()).padStart(2, "0")}:${String(startDt.getMinutes()).padStart(2, "0")}:${String(startDt.getSeconds()).padStart(2, "0")}`;
    // If TJFINDATE exists, use it; otherwise use now
    let endDateStr = dateNow;
    let endTimeStr = timeNow;
    if (tp.TJFINDATE) {
      const endDt = new Date(tp.TJFINDATE);
      endDateStr = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;
      endTimeStr = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}:${String(endDt.getSeconds()).padStart(2, "0")}`;
    }

    const updateReq = pool.request();
    updateReq.input("TJSEQ", sql.Int, tjseq);
    updateReq.input("EMPLOYE", sql.Int, tp.EMPLOYE || 0);
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
          const endDt = new Date(endDate);
          const nxtStartDate = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;
          const nxtStartTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}:${String(endDt.getSeconds()).padStart(2, "0")}`;
          // End date/time for next row: use its existing TJFINDATE if set, else empty
          let nxtEndDate = "";
          let nxtEndTime = "";
          if (nxt.TJFINDATE) {
            const nxtEnd = new Date(nxt.TJFINDATE);
            nxtEndDate = `${nxtEnd.getFullYear()}-${String(nxtEnd.getMonth() + 1).padStart(2, "0")}-${String(nxtEnd.getDate()).padStart(2, "0")}`;
            nxtEndTime = `${String(nxtEnd.getHours()).padStart(2, "0")}:${String(nxtEnd.getMinutes()).padStart(2, "0")}:${String(nxtEnd.getSeconds()).padStart(2, "0")}`;
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

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] Connecting to SQL Server: SEAFAB (Windows Auth)`);
  console.log(`[api] Databases: TS_SEATPL / TS_SEATPL_EXT`);
});
