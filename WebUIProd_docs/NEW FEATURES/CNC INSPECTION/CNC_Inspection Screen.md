We need to add a new feature, Inspection Screen, to the CNC operation screen.
Its goal is to show the operator the accepted product size tolerances on the measurements they need 

## INSPECTION Button
- will show a button titled "INSPECTION" with same glass like border as the Order Status action button.
- The Inspection button will be located on the bottom left of the screen


Timer
- Inspections should happen at fixed timed intervals during the day for an order that is in production: 
	- 7:00, 9:30, 12:00, 14:00, 15:30, 17:45, 20:30, 22:30
- When the order screen is open on a CNC order and each of these times occur during the day, the Inspection modal will popup and the Inspection button background color will become coral.

## INSPECTION Screen Component

This is a component that will have the same size as the drawing viewer card, but located on the left half side of the screen. (about 920 x 630 px on 1920 x 1080screen)
![[Inspection Component location.png]]


Inspection Component Details:

![[CNC_Inspection_1.png]]

The component has 4 sections distributed in 3 rows:
### 1. Top row: 

Header: about 9% of component height. It shows:
	1. Title in uppercase: on the left side 
		1. "Inspection Screen"  for english
		2. "Fiche D'Inspection" for french. 
	2. Employee Name dropdown on the right side and spans about 45% of the component's width (minus the padding on the sides)
	3. X button to close the component, located at the far right of the row.
### 2. middle Row:
#### 2.1 Product Tolerance table:
1. Shows on Left half:
2. Is about 27% of the component height and 50% of the width
3. Has 4 rows and 5 Columns:![[Product_Tolerance_Table.png]]
4. All columns have same width:
		   
#### 2.2 Accepted Tolerances Table

1. Shows on right half of component 
2. Is about 27% of the component height and 50% of the width
3. Has 5 rows and 4 Columns (all columns have same width)
4. ![[Accepted Tolerances Table.png]]
5. First row is a title that spans the 4 columns:
	1. "TOLERANCES en mm." in both english and french
6. By default they are fixed values as per the reference but can be manually changed by user per work order.