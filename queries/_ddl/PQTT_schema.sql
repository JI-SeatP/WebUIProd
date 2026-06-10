/* ============================================================================
   PQTT (Production Quantity Target Toolbar) — schema script
   ----------------------------------------------------------------------------
   Run against:
     - TS_SEATPL_EXT  (test)
     - AF_SEATPLY_EXT (production)
   The script is idempotent: it drops the targets table (only 2 dummy rows) and
   creates the two new run tables if they don't exist yet.

   IMPORTANT:
   - All time values are stored as INT seconds (no fractional minutes).
   - WUI_WOPM_Targets.OPCODE is INT and stores OPSEQ (FK to OPERATION.OPSEQ).
     The column name is kept "OPCODE" for backward compatibility with prior
     dummy data; the value is the integer operation sequence.
   ============================================================================ */

SET NOCOUNT ON;

-- ─── 1. Rebuild WUI_WOPM_Targets ────────────────────────────────────────────
-- Only 2 dummy rows exist; safe to drop and recreate with INT seconds.
IF OBJECT_ID('dbo.WUI_WOPM_Targets', 'U') IS NOT NULL
    DROP TABLE dbo.WUI_WOPM_Targets;

CREATE TABLE dbo.WUI_WOPM_Targets (
    TargetID      INT IDENTITY(1,1) NOT NULL,
    MACHINE_CODE  VARCHAR(50)       NOT NULL,
    NISEQ         INT               NULL,
    TRSEQ         INT               NOT NULL,
    PT_LoadTime   INT               NOT NULL,   -- seconds
    PT_OpTime     INT               NOT NULL,   -- seconds
    PT_UnloadTime INT               NOT NULL,   -- seconds
    PT_Delay      INT               NOT NULL,   -- seconds
    CreatedDate   DATETIME          NOT NULL
        CONSTRAINT DF_WUI_WOPM_Targets_Created DEFAULT (SYSDATETIME()),
    UpdatedDate   DATETIME          NOT NULL
        CONSTRAINT DF_WUI_WOPM_Targets_Updated DEFAULT (SYSDATETIME()),
    INVENTAIRE    INT               NOT NULL,
    OPCODE        INT               NULL,       -- stores OPSEQ (FK to OPERATION.OPSEQ)
    CONSTRAINT PK_WUI_WOPM_Targets
        PRIMARY KEY CLUSTERED (MACHINE_CODE, TRSEQ, INVENTAIRE),
    CONSTRAINT UQ_WUI_WOPM_Targets
        UNIQUE NONCLUSTERED (MACHINE_CODE, NISEQ, TRSEQ)
);

-- ─── 2. WUI_ProductionRuns ──────────────────────────────────────────────────
-- One row per production run (operator starts PROD → row created).
IF OBJECT_ID('dbo.WUI_ProductionRuns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WUI_ProductionRuns (
        PRSEQ         INT IDENTITY(1,1) NOT NULL,
        TRANSAC       INT          NOT NULL,
        OPSEQ         INT          NOT NULL,    -- OPERATION_SEQ (integer)
        OPCODE        VARCHAR(20)  NOT NULL,    -- OPERATION_OPCODE string (e.g. "PRESS", "VENPR")
        INSEQ         INT          NULL,        -- INVENTAIRE_SEQ
        MASEQ         INT          NOT NULL,    -- MACHINE (FK to MACHINE.MASEQ)
        NOPSEQ        INT          NOT NULL,
        TJSEQ         INT          NULL,
        NISEQ         INT          NULL,        -- Panel_NiSeq (kits only)
        EMP_NUM       VARCHAR(5)   NOT NULL,    -- matches EMPLOYE.EMNOIDENT
        PR_Start      DATETIME     NOT NULL,
        PR_End        DATETIME     NULL,
        PR_LastUpdate DATETIME     NULL,
        TotalGood     INT          NOT NULL
            CONSTRAINT DF_WUI_PR_TotalGood DEFAULT (0),
        TotalDef      INT          NOT NULL
            CONSTRAINT DF_WUI_PR_TotalDef  DEFAULT (0),
        PR_TotalTime  TIME(0)      NOT NULL
            CONSTRAINT DF_WUI_PR_TotalTime DEFAULT ('00:00:00'),
        CONSTRAINT PK_WUI_ProductionRuns PRIMARY KEY CLUSTERED (PRSEQ)
    );

    -- Stats query: filter by full operation key + EMP_NUM, then by shift window
    -- on COALESCE(PR_LastUpdate, PR_Start).
    CREATE NONCLUSTERED INDEX IX_WUI_PR_Stats
        ON dbo.WUI_ProductionRuns
        (TRANSAC, NOPSEQ, OPSEQ, MASEQ, INSEQ, NISEQ, EMP_NUM, PR_LastUpdate, PR_Start)
        INCLUDE (TotalGood, TotalDef, PR_TotalTime);

    -- Open-run sweep: find any open PRSEQs (PR_End IS NULL) on a key for
    -- defensive close at StartRun.
    CREATE NONCLUSTERED INDEX IX_WUI_PR_Open
        ON dbo.WUI_ProductionRuns (PR_End)
        INCLUDE (PRSEQ, TRANSAC, NOPSEQ, OPSEQ, MASEQ, INSEQ, NISEQ, PR_LastUpdate);

    -- Lookup by employee (reporting, future joins).
    CREATE NONCLUSTERED INDEX IX_WUI_PR_Emp
        ON dbo.WUI_ProductionRuns (EMP_NUM, PR_Start);
END;

-- ─── 3. WUI_ProductionRunDetails ────────────────────────────────────────────
-- One row per piece attempt (open when timer starts, closed on Finish or
-- on PRSEQ close).
IF OBJECT_ID('dbo.WUI_ProductionRunDetails', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WUI_ProductionRunDetails (
        PRDETSEQ    INT IDENTITY(1,1) NOT NULL,
        PRSEQ       INT      NOT NULL,
        PR_DetStart DATETIME NOT NULL,
        PR_DetEnd   DATETIME NULL,
        QtyGood     INT      NOT NULL
            CONSTRAINT DF_WUI_PRD_QtyGood DEFAULT (0),
        QtyDef      INT      NOT NULL
            CONSTRAINT DF_WUI_PRD_QtyDef  DEFAULT (0),
        CONSTRAINT PK_WUI_ProductionRunDetails PRIMARY KEY CLUSTERED (PRDETSEQ),
        CONSTRAINT FK_WUI_PRD_PRSEQ
            FOREIGN KEY (PRSEQ)
            REFERENCES dbo.WUI_ProductionRuns (PRSEQ)
            ON DELETE CASCADE
    );

    -- Find open detail row for a PRSEQ at FinishPiece / CloseRun time.
    CREATE NONCLUSTERED INDEX IX_WUI_PRD_PRSEQ
        ON dbo.WUI_ProductionRunDetails (PRSEQ, PR_DetEnd);
END;

GO
