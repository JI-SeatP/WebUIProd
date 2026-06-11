# 06 — Edge Cases and Failure Modes (old software; all Direct unless noted)

1. **Stale SM link at open** — seeded into the page (SM:512) but neutralized by the display-time
   zero-qty cleanup (broad clear) and/or timing guard. The session can therefore open showing a
   previous SM that is cleared milliseconds later.
2. **SM/DEL timing guard** — an SM with ANY DET_TRANS lines is never auto-deleted at display time
   (SM:336-347); only its TEMPSPROD links are not even cleared in that case (clear sits inside the
   `PeutSupprimerSM` branch). Posted SMs always retain lines ⇒ effectively never auto-deleted.
3. **Race: double `verifieStatutSortie`** — outer (JS:1807) and inner (JS:1798) both fire ~500ms after
   an OK click; outer sees stale ListeSMSEQ → brief disabled-flash of the OK button. Harmless; server
   re-reads DB.
4. **SMNOTRANS DOM staleness** — fresh SMNOTRANS lives in `NouvSMNOTRANS` local var until the SM
   section re-renders; intermediate readers see the old value (JS:1772; compensated server-side).
5. **`ModifieTEMPSPROD` SMNOTRANS typo** (JS:1970 `'&SMNOTRANS+'`) — argument never arrives; the SM
   REPORT loop’s DB-driven row scan compensates. Porting note: do NOT “fix” by relying on the client
   value alone; keep the DB scan.
6. **`changeTEMPSPROD` returns void** — caller assigns to `Temp`, never used.
7. **Defect-remove fires SM chain even when AvecSM=0** (JS:1374) — quirk; consequence unproven (U-2).
8. **`AjouteModifieDetailDEFECTQS` variable-name inconsistency** (`trouveTempsProd` vs
   `trouveTEMPSPROD`, QD:781-794) — CF is case-insensitive ⇒ benign.
9. **Copy-pasted ListeSMSEQ normalization ×3** in calculeQteSMQS (SM:880-942) — last wins; benign.
10. **No transactions** — any mid-sequence failure (e.g., AutoFab down between Insert-SP and
    Sortie-SP) leaves partial state: SM header without details (the display-time guard then treats
    it as deletable), or unposted SM after a successful submit’s failed REPORT.
11. **AutoFab unreachable** (new stack, dev): EXECUTE_STORED_PROC falls back to direct SQL (DB-identical);
    EXECUTE_TRANSACTION throws → submit-side REPORT wrapped in try/catch (unposted SM remains, matching
    old behavior when its SOAP call failed).
12. **Zero-qty submit** — old: gating-time SM/DEL + clears, plus `ouvrirModaleZero` confirm; new:
    confirm dialog + submit-time SM/DEL (timing deviation, same writes — 08 F16).
13. **KPI guard** prevents duplicate KPI rows per (NOPSEQ, TEMPSPROD_PROD) (QS:1884-1890).
14. **Cariste block silently swallows all errors** (`cfcatch type="ANY"`, QS:1932+) — porting must keep
    failures non-fatal.
