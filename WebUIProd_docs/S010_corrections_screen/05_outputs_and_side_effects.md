# 05 - Outputs and Side Effects

## Response payloads

### Display response (`afficheTableauCorrection`)
- **Format:** HTML string (plain text, `returnFormat="PLAIN"`)
- **Content:** Complete `<form id="FormCorrectionInventaire">` with all editable fields
- **Consumer:** JavaScript `afficheDiv` success handler → injected into `DivCorrection.innerHTML`

### Submit response (`CorrigeProduction`)
- **Format:** String (plain text)
- **Content:** Accumulated error/info messages concatenated with `<br>` separator, or empty string on full success
- **Consumer:** JavaScript `CorrigeProduction` success handler
- **Post-action:** On success, JS calls `afficheDiv('DivTempsHomme', ...)` to reload the time-tracking table

## Database side effects (submit)

### 1. DET_TRANS rows updated (finished products)
- **Trigger:** `form.DTRQTE_PF_<DTRSEQ> != DTRQTE`
- **SP:** `Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)`
- **Effect:** Creates correction transaction records (TRNO_EQUATE = 14) in DET_TRANS
- **Confidence:** Strong inference — the OUTER APPLY in R4 query checks for TRNO_EQUATE=14 rows, implying the SP creates them

### 2. DET_TRANS rows updated (material exits)
- **Trigger:** `form.DTRQTE_SM_<DTRSEQ> != DTRQTE`
- **SP:** `Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)`
- **Effect:** Same as above for SM transactions
- **Confidence:** Strong inference

### 3. cNOMENCOP scrap quantity updated
- **Direct SQL:** `UPDATE cNOMENCOP SET NOPQTESCRAP = @TotalDefect WHERE NOPSEQ = @cNOMENCOP`
- **Confidence:** Direct

### 4. TEMPSPROD record updated
- **SP:** `Nba_Sp_Update_Production(TJSEQ, EMSEQ, OPERATION, MACHINE, TRANSAC, ..., dates, quantities, mode, note, SMNOTRANS)`
- **Effect:** Updates the TEMPSPROD row with corrected dates, quantities, employee, operation, machine
- **Confidence:** Direct (call site visible; SP internals unknown)

### 5. TEMPSPROD cost fields recalculated
- **Direct SQL** using `FctCalculTempsDeProduction(@TJSEQ)`
- **Fields updated:** `TJSYSTEMPSHOMME`, `TJTEMPSHOMME`, `TJEMCOUT`, `TJOPCOUT`, `TJMACOUT`
- **Condition:** PROD mode only
- **Confidence:** Direct

### 6. Product-in-progress recalculated
- **SP:** `Nba_Recalcul_Un_Produit_EnCours(TRANSAC, 0)`
- **Effect:** Recalculates encours (work-in-progress) totals for the transaction
- **Condition:** PROD mode only
- **Confidence:** Direct (call site visible; SP internals unknown)

### 7. Next TEMPSPROD row timing cascaded
- **SP:** `Nba_Sp_Update_Production` (second call, for next TJSEQ)
- **Effect:** Sets the next row's start time to this row's corrected end time
- **Condition:** Only if a subsequent TEMPSPROD row exists for same TRANSAC+CNOMENCOP
- **Confidence:** Direct

## Logging side effects

Every SP call and direct SQL is logged via `<cflog>`:
- **Log file:** `Ecran_<dbClient>_<mm_dd_yyyy>.log`
- **Condition:** `application.afficheLog EQ 1`
- **Content:** Username, command, parameters, results, and AVANT/APRES markers
- **Source:** Multiple locations throughout `CorrectionInventaire.cfc`
- **Confidence:** Direct

## Events / notifications

None. The correction flow does not trigger email, SMS, or event emissions.

## Cache effects

None observed. No cache invalidation or refresh calls.

## Side-effect ordering

```
1. EPF DET_TRANS corrections (per changed row, sequential)
      ↓
2. cNOMENCOP.NOPQTESCRAP update
      ↓
3. SM DET_TRANS corrections (per changed row, sequential)
      ↓
4. TEMPSPROD main update (Nba_Sp_Update_Production)
      ↓
5. TEMPSPROD cost recalculation (FctCalculTempsDeProduction)  [PROD only]
      ↓
6. Encours recalculation (Nba_Recalcul_Un_Produit_EnCours)   [PROD only]
      ↓
7. Next TEMPSPROD cascade (Nba_Sp_Update_Production #2)       [if exists]
      ↓
8. Return to client → reload DivTempsHomme
```

## AutofabAPI SOAP mechanism

All stored procedure calls go through `support.cfc::envoiXMLGet`:
1. Builds SOAP 1.2 envelope with `<sQuery>ProcName p1,p2,...</sQuery>` and `<nExt>0</nExt>`
2. HTTP POST to `http://<PAWS_IP>:<PORT>/AutofabAPI:<PORT>/EXECUTE_STORED_PROC`
3. Hardcoded `sleep(2000)` after each call
4. XML response parsed to ColdFusion struct
5. Caller checks `retval`, `OutputValues.ERREUR`, `OutputValues.SQLERREUR`, `OutputValues.MSG_EQUATE`

**Confidence:** Direct — full function body read at `support.cfc:3329-3520`
