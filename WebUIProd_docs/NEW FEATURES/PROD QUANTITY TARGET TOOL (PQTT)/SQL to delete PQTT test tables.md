-- =============================================================================
-- Reset PQTT tables: clear all rows AND reset the IDENTITY counters so the
-- next inserted PRSEQ = 1 and PRDETSEQ = 1.
--
-- Notes:
--   - TRUNCATE TABLE on WUI_ProductionRuns is rejected by SQL Server because
--     WUI_ProductionRunDetails has a FOREIGN KEY pointing to it (even when
--     the child table is empty). So we DELETE both, then reseed identities
--     via DBCC CHECKIDENT.
--   - WUI_ProductionRunDetails.PRSEQ has ON DELETE CASCADE, so deleting the
--     parent would clear the child automatically — but we delete details
--     explicitly first to be unambiguous.
-- =============================================================================

USE TS_SEATPL_EXT;      -- change to AF_SEATPLY_EXT in production
GO

-- BEFORE snapshot
SELECT
    (SELECT COUNT(*) FROM dbo.WUI_ProductionRunDetails) AS detRowsBefore,
    (SELECT COUNT(*) FROM dbo.WUI_ProductionRuns)       AS runRowsBefore,
    IDENT_CURRENT('dbo.WUI_ProductionRunDetails')       AS detIdentBefore,
    IDENT_CURRENT('dbo.WUI_ProductionRuns')             AS runIdentBefore;

-- 1. Clear the child first, then the parent.
DELETE FROM dbo.WUI_ProductionRunDetails;
DELETE FROM dbo.WUI_ProductionRuns;

-- 2. Reseed the IDENTITY counters so the next inserted row gets ID = 1.
DBCC CHECKIDENT ('dbo.WUI_ProductionRunDetails', RESEED, 0);
DBCC CHECKIDENT ('dbo.WUI_ProductionRuns',       RESEED, 0);

-- AFTER snapshot
SELECT
    (SELECT COUNT(*) FROM dbo.WUI_ProductionRunDetails) AS detRowsAfter,
    (SELECT COUNT(*) FROM dbo.WUI_ProductionRuns)       AS runRowsAfter,
    IDENT_CURRENT('dbo.WUI_ProductionRunDetails')       AS detIdentA