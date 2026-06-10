The goal of PQTT is to allow user to log the quantities produced in a simple way that can:
- allow comparison between Production Targets and actual time per piece so users can ACT quickly
- allow quantities to be entered on a per unit basis to track time per unit and be used as input to create AFAB quantities/labels



### PQTT General Design

![[PQTT_reference_01.png]]
- it will be shown at the bottom of the screen, in the middle of the row where the Operation Status toolbar and the Inspection buttons are shown
- It is composed of 2 containers/divs, that will have same dark glass background and dropshadow as Status Action Button, but that will be 13.5% taller (81 px for the Status Action button vs 92 px for the PQTT toolbar)
- It will have same fixed property as as Status Action Button (will not move if the rest of the page content is scrolled)
- This feature will not be shown / used in VCUT operations (OPCODE "VENPR" OPSEQ = 1)
- The feature uses 2 new tables:
	- dbo.WUI_ProductionRuns: stores the production run overview and totals. Uses PRSEQ as identity
	- dbo.WUI_ProductionRunDetails: stores the detailed log of each unit produced for a production run PRSEQ using PRDETSEQ as identity
	- 
![[WUI_ProdRuns_Tables.png]]

#### Display: 
the PQQT will be displayed ONLY when the operation is "In Production" and it will start automatically counting.

**PQQT Start:**  
When user selects the "In Production" option from the Operation Status Action. This will trigger the following:
1. A modal OP_Confirm asking operator name  OP_Name will popup. This will allow user to search and select by Employee ID or By Employee Name from the data loaded on GetEmpList.cfm using the following SQL query:
			   
				   SELECT
						E.EMNOIDENT AS [EMP_NUM]
						,E.EMNOM AS [EMP_NOM]
					FROM Autofab_EMPLOYE AS E WITH(NOLOCK) 
					WHERE E.EMACTIF = 1
					
1. When employee is selected the modal closes and is passed to the new production run start procedure and the PQQT will become visible:
2. The a new ProdRun (PRSEQ) entry for the selected work order, EMP_NUM, TRANSAC, TJSEQ, MASEQ, OPSEQ, NOPSEQ, INSEQ, and NISEQ (if available) should be created in dbo.WUI_ProductionRuns table with current server timestamp in PR_Start field (datetime field)
3. The first PRDETSEQ should be created in dbo.WUI_ProductionRunDetails for the PRSEQ, logging the PR_DetStart date time.
4. The PieceTimer will start to count time until FinishPiece button is clicked. (explained in PQQT Field Details)
		
**PQQT Close**
The PQQT should close when the user changes the operation mode or when the window is closed for some reason. 
#important should put some way to query this that is not resource demanding on the client system.
When it closes the currently active production run will be closed: 
1. PR_End datetime will be added to the PRSEQ and to its open PRDETSEQ.
2. The PQQT will become hidden.

#### PQQT Bar Location
![[PQQT_Bar_Location.png]]
### PQQT Field Details

The fields of the PQQT component are divided into 2 groups: PieceCounter and PieceStats:

![[PQTT_FieldNames_02.png]]
![[PQQT element style details.png]]
#### PieceCounter
1. ProdRunTotals Section
	1. ProdRunTotalGood
	2. ProdRunTotalDef
2. PieceTimer: 
	1. Will count the time taken to produce each piece, starting from time cero, till the FinishPiece button is clicked. Each piece of a PRSEQ is entered into its own PRDETSEQ in dbo.WUI_ProductionRunDetails.
		1. Each time user clicks FinishPiece button (and clicks QtyGood or QtyDef button):
			1. PR_DetEnd is entered for the existing PRDETSEQ 
			2. QtyGood or QtyDef is entered for the existing PRDETSEQ 
			3. the existing PRDETSEQ is closed.
			4. a new PRDETSEQ for the same PRSEQ is created.

3. FinishPiece BUTTON:.  When this button is clicked, the following should happen:
	1. A Popover with same glass like and shadow background color opens on top of field that shows 2 Buttons: 
		1. "Good" (English) / "Bon" (French): 
			- Has background color `#C1F6CA` and black fonts and bordercolor black
			- If clicked, it will
				- Adds 1 unit to field ProdRun_TotalGood on dbo.WUI_ProductionRuns table for the current PRSEQ entry for the selected work order and operation
				-  The PR_LastUpdate field should be updated with current datetime
				- PR_DetEnd is entered for the existing PRDETSEQ 
				- QtyGood is entered 1 and QtyDef is entered 0 for the existing PRDETSEQ 
				- the existing PRDETSEQ is closed.
				- A new PRDETSEQ for the same PRSEQ is created.
				- The current PieceTimer time displayed should be added to field ProdRun_TotalTime of the current ProdRun entry for the selected work order and operation
				- The PieceStats section should be updated including the new Piece completed.
		2.  "Defective" (English) / "Défectueuse" (French): 
			- Has background color `#F8CECC` and black fonts and bordercolor black
			- If clicked, it will:
				- adds 1 unit to field ProdRun_TotalDef on dbo.WUI_ProductionRuns table for the current ProdRun entry for the selected work order and operation
				-  The PR_LastUpdate field should be updated with current datetime
				- PR_DetEnd is entered for the existing PRDETSEQ 
				- QtyGood is entered 0 and QtyDef is entered 1 for the existing PRDETSEQ 
				- the existing PRDETSEQ is closed.
				- A new PRDETSEQ for the same PRSEQ is created.
				- The current PieceTimer time displayed should be added to field ProdRun_TotalTime of the current ProdRun entry for the selected work order and operation
	2. The PieceTimer should stop its count when:
		1. When the status of the operation screen is changed to anything that is not "In Production"

	

#### PieceStats
This section will show the production stats of the current production screen: TRANSAC, OPSEQ, NOPSEQ, MASEQ, and INSEQ (or NISEQ if available (for kits)).

It will summarize data for all PRSEQs related to the same combination of TRANSAC, NOPSEQ, OPSEQ, MASEQ, and INSEQ (or NISEQ if available (for kits)).
##### StatsPerPiece

- 5 - RunAvgTimePerPiece: is an average of the time per piece. It averages PR_TotalTime of all related PRSEQs / (TotalGood  of all related PRSEQs + TotalDef of all related PRSEQs) . 
	- Background conditional color: background will change from white to other color as follows:
		- When ([TargetTimePerPiece] + [PR_DELAY])> [RunAvgTimePerPiece] > [TargetTimePerPiece] then color is #F8CECC
		- When  [RunAvgTimePerPiece] > ([TargetTimePerPiece] + [PR_DELAY]) then color is #FF3D11
- 6 - StatsPerPieceTitle: Title text that shows "MINUTES/PIECE" 
- 7 - [TargetTimePerPiece]: Comes from query  PQQT_OpTargets_Get.cfm field [TargetTimePerPiece]


##### StatsPerHour Section
- 8 - RunAvgPcsHour: is an average of the quantity of pieces produced per hour. 
      Its formula is: 
	      (SUM of [TotalGood]  of all related PRSEQs + SUM of [TotalDef] of all related PRSEQs)/ Sum of PR_TotalTime (converted to number of hours). 
	- Background conditional color: background will change from white to other color as follows:
		- When [TargetAvgPcsHour_Min]< [RunAvgPcsHour] < [TargetAvgPcsHour] then color is `#F8CECC`
		- When  [RunAvgPcsHour] < [TargetAvgPcsHour_Min] then color is  `#FF3D11` 
- 9 - StatsPerHourTitle
- 10 - TargetAvgPcsHour: 60 / [TargetTimePerPiece]


#### PQQT_OpTargets_Get.cfm 

PQQT_OpTargets_Get.cfm uses the following parameters for the selected operation: 
TRANSAC, OPCODE, MACODE, NISEQ, INVENTAIRE with the following SQL query: 

SELECT 
       [MACHINE_CODE] AS MACODE
      ,OPCODE
      ,[NISEQ]
      ,[TRSEQ] AS TRANSAC
      ,[INVENTAIRE]
      ,[PT_LoadTime]+[PT_OpTime]+[PT_UnloadTime] AS TargetTimePerPiece
      ,[PT_Delay]
      ,ROUND(60/([PT_LoadTime]+[PT_OpTime]+[PT_UnloadTime]+[PT_Delay]),2) AS TargetAvgPcsHour
      ,ROUND(60/([PT_LoadTime]+[PT_OpTime]+[PT_UnloadTime]),2) AS TargetAvgPcsHour_Min
  FROM [AF_SEATPLY_EXT].[dbo].[WUI_WOPM_Targets] 
	  WHERE 
		  [MACHINE_CODE] = @MACODE
		  AND NISEQ = @NISEQ (if available)
		  AND TRSEQ = @TRANSAC
		  AND OPCODE = @OPERATION
		  AND INVENTAIRE = @INVENTAIRE (OR @INSEQ, I am not sure)