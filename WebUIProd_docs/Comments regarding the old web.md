
# What I don't like

This website has many features that need to be improved.
In general
- the look and feel is not modern. 
- The elements shown are not designed according to UX design best practices. 
	- Some sections have too much padding between them
	- Some fontsized are not correct (either too small)
	- They lack proper whitespace, component design and field visual consistency in relation to content displayed and screen purpose.
	- Some fields are too small, others too large
- top menu and footer areas use too much vertical space (the logos use too much space)
- The transition between screens is too long. The queries are slow to load most of the time.
- the onscreen keyboard is very annoying. 
	- It positions itself incorrectly, covering areas that should be displayed.
	- It can't be moved (which  makes the above problem worse)
	- It has very old style look and feel
- They are not optimized for tablet mode or small screens, so layout breaks if window screen is resized.
- Font selection is not optimal. text and date fields should use a narrow font (Roboto Condensed)

## S002 - Work Order List 

1. Too much vertical space between header buttons, user/session and filters sections. They should be combined into a single section, where filters are shown as a modal window or drawer that shows.
2. There is a limit on the number of rows the order table shows, so this creates an issue.
3. The filters section layout is terrible. 
	1. The date range filters (date de debut and date de fin) are never used and take up so much space. They should be moved to the date preset dropdown filter as "Custom Dates" and when this is clicked, the 2 datepickers appear.
	2. The machine filters should be double the height and with word wrap so that machines with long names take half the horizontal space.
	3. The "0 Pressing not scheduled" machine should be filtered out
	4. The machine status should not be confused with order status. It now is colored based on order statuses but they are different things. One order can be stopped because it does not have enough material and while they wait for it, another order could be in setup, running or in pause in same machine. 
	5. the searchbox does not use enter to execute. 
	6. Dropdown Filter per operation (Press, CNC,etc)
	7. Status multiple select dropdown, that allows to select in production,in setup , in pause or stopped.
4. The Work Order list table
	1. The date column is not needed to be displayed.
	2. I don;t like the action buttons like that. I would prefer a sing "Actions" button that shows a mini menu with the 2 or 3 actions available. In this way the width of this column can be greatly reduced.
	3. Maybe the table could have 2 levels. one for work order and inside the different operations/machines
	4. Show order comments if any through an icon that warns there are comments, and if user clicks it can see the comments from most recent to oldest.
	5. Add PPAP indicator
	6. Add column header sorter



## S003 - Operation Details Screen (DivOperation) 

1. Header info block (arrondi) - top block
	- The layout is terrible. Too much width for" "Work order" and Quantities columns and too little for Operation
	- Work Order number should be bigger fontsize
	- The field titles should be in mid gray in order to read better the field values. So for Operation field, "OPERATION" should be in mid gray font and "MACHINING" should be kept in black font.
- Middle block
	- Too much whitespace because of poor field/column widths
	- Incorrect alignment of text fields.
- Bottom block. The pdf section should show the drawing with zoom extents all in the viewer to avoid showing the drawing very small and with a lot of black borders around.
- Add "On hold" to the operations statuses (suggested color - orange). This status allows us to quickly detect an abnormality in production, whether due to a problem or an administrative reason.
- Allow to reset the “ready” status of an order is occasionally planned production of a certain order so that it is changed to the “setup” state but then for some reason it is cancelled and a different order is produced, it would be very convenient to be able to return the order that will not be produced to the “ready” state.

S007 and S008
I don't like that the operator needs to see 2 screens, one for time entry and the other for production entries. It would be simple if user could see all time dedicated per work order operation and the quantities produced in a unified screen. This could be developed as an additional screen after initial website is migrated.