The goal of PQTT is to allow user to log the quantities produced in a simple way that can:
- allow comparison between Production Targets and actual time per piece so users can ACT quickly
- allow quantities to be entered on a per unit basis to track time per unit and be used as input to create AFAB quantities/labels


### PQTT General Design

 ![[PQTT_reference.png]]

- it will be shown at the bottom of the screen, in the middle of the row where the Operation Status toolbar and the Inspection buttons are shown 
- The main div will have same dark glass background and dropshadow as Status Action Button
- It will have same fixed property as as Status Action Button (will not move if the rest of the page content is scrolled)

### PQQT Field Details

Each of the fields of the PQQT component is described below

![[PQTT_FieldNames.png|1280]]

1. PieceTimer: 
	1. Will count the time it passes between these situations: 
		1. Production Start: When user selects the "In Production" option from the Operation Status Action the following should happen:
			1. A modal OP_Confirm asking operator name  OP_Name will popup. This will allow user to search by Employee ID or By Employee Name from the data loaded on GetEmpList.cfm using the following SQL query:
			   
				   SELECT
						E.EMNOIDENT AS [EMP_NUM]
						,E.EMNOM AS [EMP_NOM]
					FROM Autofab_EMPLOYE AS E WITH(NOLOCK) 
					WHERE E.EMACTIF = 1
					
			1. The a new ProdRun entry for the selected work order, EMP_NUM and operation should be created in dbo.WUI_ProductionRuns table
			2. The PieceTimer will start to count time until FinishPiece button is clicked. 
	1. Pause: When user selects the Pause option from the Operation Status Action the PieceTimer will turn to 00:00
2. FinishPiece BUTTON:.  When this button is clicked, the following should happen:
	1. A Popover with same glass like and shadow background color opens on top of field that shows 2 Buttons: 
		1. "Good" (English) / "Bon" (French): 
			- Has background color #C1F6CA and black fonts and bordercolor black
			- If clicked, it will
				- Adds 1 unit to field ProdRun_TotalGood on dbo.WUI_ProductionRuns table for the current ProdRun entry for the selected work order and operation
				- The ProdRun_LastUpdate field should be updated with current datetime
				- The current PieceTimer time displayed should be added to field ProdRun_TotalTime of the current ProdRun entry for the selected work order and operation
		2.  "Defective" (English) / "Défectueuse" (French): 
			- Has background color #F8CECC and black fonts and bordercolor black
			- If clicked, it will:
				- adds 1 unit to field ProdRun_TotalDef on dbo.WUI_ProductionRuns table for the current ProdRun entry for the selected work order and operation
				- The ProdRun_LastUpdate field should be updated with current datetime
				- The current PieceTimer time displayed should be added to field ProdRun_TotalTime of the current ProdRun entry for the selected work order and operation
	2. The PieceTimer should reset its count
3. ProdRunTotals Section
4. ProdRunTotalGood
5. ProdRunTotalDef
6. StatsPerPiece Section
7. RunAvgTimePerPiece
8. StatsPerPieceTitle
9. TargetTimePerPiece
10. StatsPerHour Section
11. RunAvgPcsHour
12. StatsPerHourTitle
13. TargetAvgPcsHour


![[PQTT_Field styles.png]]