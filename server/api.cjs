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

    // Step 1: Look up TJSEQ + NOPSEQ from vEcransProduction (EXT db)
    let tjseq = null;
    let nopseq = null;
    try {
      const poolExt = await getPoolExt();
      const lookupReq = poolExt.request().input("transac", sql.Int, transac);
      let lookupSql = `SELECT TOP 1 v.TJSEQ, v.NOPSEQ FROM vEcransProduction v WHERE v.TRANSAC = @transac`
        + ` AND v.OPERATION <> 'FINSH'`;
      if (copmachine) {
        lookupReq.input("copmachine", sql.Int, copmachine);
        lookupSql += ` AND v.COPMACHINE = @copmachine`;
      }
      lookupSql += ` ORDER BY v.TJSEQ DESC`;
      const lookup = await lookupReq.query(lookupSql);
      if (lookup.recordset.length) {
        tjseq = lookup.recordset[0].TJSEQ || null;
        nopseq = lookup.recordset[0].NOPSEQ || null;
      }
    } catch (extErr) {
      console.warn("EXT lookup failed:", extErr.message);
    }

    if (!tjseq && !nopseq) {
      return res.json({
        success: false,
        error: `Operation not found for transac=${transac} copmachine=${copmachine}`,
      });
    }

    // Step 2: Main query
    const pool = await getPool();
    let result;

    // Common SELECT fields (shared between TJSEQ and NOPSEQ paths)
    const commonSelect = `
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
        ISNULL(CN_FAB.INVENTAIRE_P, T.INVENTAIRE) AS PRODUIT_SEQ,
        ISNULL(CN_FAB.INVENTAIRE_P_INNOINV, T.INVENTAIRE_INNOINV) AS PRODUIT_CODE,
        ISNULL(CN_FAB.INVENTAIRE_P_INDESC1, T.INVENTAIRE_INDESC1) AS PRODUIT_P,
        ISNULL(CN_FAB.INVENTAIRE_P_INDESC2, T.INVENTAIRE_INDESC2) AS PRODUIT_S,
        T.INVENTAIRE AS KIT_SEQ,
        T.TRNOTE,
        CNOP.INVENTAIRE AS INVENTAIRE_VCUT,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INNOINV ELSE CNOP.INVENTAIRE_INNOINV END AS VCUT_INNOINV,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INDESC1 ELSE CNOP.INVENTAIRE_INDESC1 END AS VCUT_INDESC1,
        CASE WHEN ISNULL(CNOP.INVENTAIRE,T.INVENTAIRE) = T.INVENTAIRE THEN T.INVENTAIRE_INDESC2 ELSE CNOP.INVENTAIRE_INDESC2 END AS VCUT_INDESC2,
        CNOP.OPERATION AS OPERATION_SEQ,
        CNOP.OPERATION_OPCODE AS OPERATION,
        CNOP.OPERATION_OPDESC_P AS OPERATION_P,
        CNOP.OPERATION_OPDESC_S AS OPERATION_S,
        CNOP.NOPORDRERECETTE AS ORDRERECETTE,
        OP.OPCOUTHEURE AS TAUXHORAIREOPERATION,
        CNOP.CNOMENCLATURE AS CNOMENCLATURE,
        CNOM.CNOM_QTE,
        INVENTAIRE_FAB.IN_QTE_PAR_EMBAL AS QTE_PAR_EMBAL,
        INVENTAIRE_FAB.IN_QTE_PAR_CONT AS QTE_PAR_CONT,
        CN_FAB.NIQTE,
        PR_QUANTITE_A_FAB AS QTE_A_FAB,
        MA.MASEQ AS MACHINE,
        MA.MACODE,
        MA.MADESC_P AS MACHINE_P,
        MA.MADESC_S AS MACHINE_S,
        T.UNITE_INV_UNDESC1 AS UNITE_P,
        T.UNITE_INV_UNDESC2 AS UNITE_S,
        T.TRSEQ AS TRANSAC,
        CNOP.NOPSEQ,
        CNOP.NOPSEQ AS COPMACHINE,
        CASE WHEN CN_FAB.NILONGUEUR = 0 OR CN_FAB.NILARGEUR = 0 or FLOOR( ( SRC.INLONGUEUR_MSE / CN_FAB.NILONGUEUR) * ( SRC.INLARGEUR_MSE / CN_FAB.NILARGEUR)) = 0
        THEN 0
        ELSE
          CEILING(CN_FAB.NIQTE / FLOOR( ( SRC.INLONGUEUR_MSE / CN_FAB.NILONGUEUR) * ( SRC.INLARGEUR_MSE / CN_FAB.NILARGEUR)))
          END
        AS QTY_REQ,
        TS_SEATPL_EXT.DBO.FctGet_PANNEAUX(CNOP.TRANSAC,CNOP.CNOMENCLATURE) AS Panneau,
        PC.PPINNOINV,
        f.FMCODE,
        MA.FAMILLEMACHINE,
        TRANSFERT.TREPOSTER AS TREPOSTER_TRANSFERT,
        VBE.DCQTE_A_FAB AS VBE_DCQTE_A_FAB, VBE.DCQTE_A_PRESSER, VBE.DCQTE_PRESSED, VBE.DCQTE_PENDING_TO_PRESS, VBE.DCQTE_PENDING_TO_MACHINE, VBE.DCQTE_FINISHED, VBE.DCQTE_REJET, VBE.PCS_PER_PANEL, VBE.CONOPO, VBE.SHARE_PRESSING, VBE.PAGE_COMPO, VBE.Panel_NiSeq,
        (SELECT SUM(TP.TJQTEDEFECT) FROM TEMPSPROD TP WHERE TP.TRANSAC = T.TRSEQ AND TP.CNOMENCOP = CNOP.NOPSEQ) AS NOPQTESCRAP,
        VBE.Mold AS MOULE_CODE,
        VBE.NUM_PER_PACK AS PANNEAU_CAVITE,
        VBE.OPENING AS MOULE_CAVITE,
        VBE.[ACTUAL GAP] AS MOULE_ECART,
        TS_SEATPL_EXT.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@MOLD_TYPE@') AS MOULE_TYPE,
        TS_SEATPL_EXT.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@TIME_PR_PRESSING@') AS PRESSAGE_PRESSAGE,
        TS_SEATPL_EXT.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@TIME_PR_TEST_PR@') AS PRESSAGE_TEST_APRES,
        TS_SEATPL_EXT.DBO.AUTOFAB_FctSelectVarCompo(T.TRSEQ, CNOP.CNOMENCLATURE, '@PRESS_NOTE@') AS PRESSAGE_NOTE,
        VBE.PV_Groupe AS GROUPE,
        VBE.PRODUCT_TYPE AS TYPEPRODUIT,
        DC.DCPRIORITE`;

    // Common joins after CNOP is available (CNOP is joined per-path before this)
    const commonJoins = `
        LEFT OUTER JOIN TS_SEATPL_EXT.dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = (SELECT TOP 1 TRANSAC FROM TS_SEATPL_EXT.dbo.VSP_BonTravail_Entete VBE2 WHERE VBE2.TRANSAC = T.TRSEQ)
        LEFT OUTER JOIN PL_RESULTAT PL ON CNOP.NOPSEQ = PL.CNOMENCOP
        LEFT OUTER JOIN INVENTAIRE INVENTAIRE_FAB ON CNOP.INVENTAIRE_P=INVENTAIRE_FAB.INSEQ
        LEFT OUTER JOIN CNOMENCLATURE CN_FAB ON CN_FAB.NISEQ = CNOP.CNOMENCLATURE
        LEFT OUTER JOIN DET_CNOMENCOP D ON D.NOMENCOP = CNOP.NOPSEQ
        LEFT OUTER JOIN CNOMENCLATURE CN_MAT ON CN_MAT.NISEQ = D.NOMENCLATURE OR CN_MAT.NISEQ = CNOP.NOMENCLATURE
        LEFT OUTER JOIN CNOMENCOP_MACHINE CNOM ON CNOM.CNOMENCOP = CNOP.NOPSEQ AND CNOM.CNOM_SEQ = PL.CNOMENCOP_MACHINE
        INNER JOIN MACHINE MA ON MA.MASEQ = PL.MACHINE
        INNER JOIN FAMILLEMACHINE f ON f.FMSEQ = MA.FAMILLEMACHINE
        LEFT OUTER JOIN OPERATION OP ON CNOP.OPERATION = OP.OPSEQ
        OUTER APPLY (SELECT TOP 1 PPINNOINV FROM PRIXCLIENT WHERE CNOP.INVENTAIRE_P = INVENTAIRE) AS PC
        LEFT OUTER JOIN cNOMENCLATURE AS MCX_KIT ON MCX_KIT.TRANSAC = CNOP.TRANSAC AND MCX_KIT.NIREGRP_PROD1 in ('KIT','AP')
        OUTER APPLY(SELECT I.INLONGUEUR_MSE, I.INLARGEUR_MSE FROM INVENTAIRE I WHERE I.INSEQ = CNOP.INVENTAIRE) SRC
        OUTER APPLY (SELECT TOP 1 TE.TREPOSTER FROM TRANSFENTREP TE Where TE.CNOMENCOP = CNOP.NOPSEQ ORDER BY TE.TRESEQ DESC) AS TRANSFERT`;

    if (tjseq) {
      // Normal path: operation has TEMPSPROD record
      result = await pool.request().input("tjseq", sql.Int, tjseq).query(`
        SELECT DISTINCT
        ${commonSelect},
        (SELECT SUM(TEMPSPROD.TJQTEPROD) FROM TEMPSPROD AS TEMPSPROD WHERE TEMPSPROD.TRANSAC = CNOP.TRANSAC AND TEMPSPROD.CNOMENCOP = CNOP.NOPSEQ) AS QTE_PRODUITE,
        ISNULL(CNOM.CNOM_QTE, CASE WHEN CN_FAB.NISEQ IS NOT NULL THEN DBO.FctQteASortir(CN_FAB.NISEQ) * DC.DCQTE_A_FAB ELSE DC.DCQTE_A_FAB END) - ISNULL((SELECT SUM(TP.TJQTEPROD) FROM TEMPSPROD TP WHERE TP.CNOMENCOP = CNOP.NOPSEQ AND ISNULL(TP.cNomencOp_Machine,0) = ISNULL(CNOM.CNOM_SEQ,0)),0) AS QTE_RESTANTE,
        TPROD.MODEPROD_MPCODE AS STATUT_CODE,
        TPROD.MODEPROD_MPDESC_P AS STATUT_P,
        TPROD.MODEPROD_MPDESC_S AS STATUT_S,
        TPROD.TJFINDATE AS TJFINDATE,
        TPROD.TJPROD_TERMINE AS TERMINE,
        TPROD.TJSEQ
        FROM COMMANDE CO
        INNER JOIN TRANSAC T ON T.TRNO = CO.CONOTRANS
        INNER JOIN DET_COMM DC ON DC.TRANSAC = T.TRSEQ
        INNER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = T.TRSEQ
        INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP
        ${commonJoins}
        WHERE TPROD.TJSEQ = @tjseq
      `);
    } else {
      // No TEMPSPROD yet — operation not started. Query by NOPSEQ without TEMPSPROD.
      console.log(`No TJSEQ for transac=${transac}, using NOPSEQ=${nopseq} fallback query`);
      result = await pool.request().input("nopseq", sql.Int, nopseq).query(`
        SELECT DISTINCT
        ${commonSelect},
        0 AS QTE_PRODUITE,
        ISNULL(CNOM.CNOM_QTE, CASE WHEN CN_FAB.NISEQ IS NOT NULL THEN DBO.FctQteASortir(CN_FAB.NISEQ) * DC.DCQTE_A_FAB ELSE DC.DCQTE_A_FAB END) AS QTE_RESTANTE,
        'Pret' AS STATUT_CODE,
        N'Prêt' AS STATUT_P,
        'Ready' AS STATUT_S,
        NULL AS TJFINDATE,
        NULL AS TERMINE,
        NULL AS TJSEQ
        FROM COMMANDE CO
        INNER JOIN TRANSAC T ON T.TRNO = CO.CONOTRANS
        INNER JOIN DET_COMM DC ON DC.TRANSAC = T.TRSEQ
        INNER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = T.TRSEQ AND CNOP.NOPSEQ = @nopseq
        ${commonJoins}
      `);
    }

    if (!result.recordset.length) {
      return res.json({
        success: false,
        error: `Operation not found for TJSEQ=${tjseq} NOPSEQ=${nopseq}`,
      });
    }

    const row = result.recordset[0];

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
                 CI.CRCRITERE_7 AS TYPE
          FROM cNOMENCLATURE cn
          LEFT JOIN CRITERE_INV CI ON CI.INVENTAIRE = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV ON INV.INSEQ = cn.INVENTAIRE_M
          LEFT JOIN INVENTAIRE INV_P ON INV_P.INSEQ = cn.INVENTAIRE_P
          WHERE cn.NISEQ = @panelNiSeq
        `);
      if (detailResult.recordset.length) {
        panelDetail = detailResult.recordset[0];
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
app.post(
  "/submitQuestionnaire.cfm",
  handler(async (req, res) => {
    const {
      transac,
      copmachine,
      type,
      employeeCode,
      goodQty,
      primaryCause,
      secondaryCause,
      notes,
      moldAction,
      defects,
      finishedProducts,
    } = req.body;

    // Stub — no DB writes yet
    console.log("[submitQuestionnaire] stub:", {
      transac,
      type,
      employeeCode,
      goodQty,
    });

    res.json({
      success: true,
      data: { transac, type },
      message:
        "Questionnaire submitted successfully (stub — DB writes pending)",
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
