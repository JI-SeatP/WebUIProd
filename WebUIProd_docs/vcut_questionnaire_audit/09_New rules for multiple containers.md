Ok, so that logic of the old software is incorrect. Please create the following logic:

- When the quantity produced requires more proportional material than the quantity available for the the first skid on the dropdown list, it should use all available quantity of the first skid and the remaining on the next available skid. 
	- If no other skid has available qty, a warning should show "Not enough material. Only [Material Qty available] are left."
- So if quantity produced is 100 and the bom ratio is 0.5, then we need to consume 50. 
	- If order has 3 skids where:
		- skidA has 10 remaining
		- skidB has 30 remaining
		- skidC has 50 remaining
	- It would consume:
		- the full 10 of skidA 
		- the full 30 from skidB. 
		- 10 pcs from skidC
	- So after the production run, only skidC would be remaining with 40 pcs of material.
-