# Code Analysis Guide

How to scan legacy `.cfm` files in `src/old/` and extract a structured feature inventory.

## Scanning Process

### Step 1: Inventory the Files

```bash
find src/old/ -name "*.cfm" -type f | sort
```

List all `.cfm` files. Each top-level `.cfm` file typically maps to one screen. 
Included files (via `<cfinclude>`) are supporting files — note them but don't create 
separate screen docs for them.

### Step 2: Identify Screens

For each `.cfm` file, determine:
- Is this a standalone page (a "screen") or an include/partial?
- Standalone pages have `<html>`, `<body>`, or are directly accessed by users
- Includes are referenced via `<cfinclude template="...">` from other files

Assign screen codes (`S001`, `S002`, ...) to standalone pages only.

### Step 3: Extract Sections

Read each screen file and identify visual sections. Look for:
- HTML structural elements: `<div>`, `<table>`, `<form>`, `<fieldset>`
- Comment markers: `<!--- Section: ... --->` (ColdFusion comments use three dashes)
- Visual separators: `<hr>`, heading tags, distinct layout blocks
- Conditional blocks: `<cfif>` that show/hide entire sections

Each distinct visual area becomes a section with code `-01`, `-02`, etc.

### Step 4: Extract Features

Within each section, identify individual features. A feature is a distinct piece of 
functionality or UI element. Look for:

**Display features:**
- Tables/grids showing data (`<table>`, `<cfoutput query="...">`)
- Labels, status indicators, badges
- Calculated/derived values
- Charts or visual indicators

**Interactive features:**
- Form inputs (`<input>`, `<select>`, `<textarea>`)
- Buttons and their actions (`<input type="submit">`, onclick handlers)
- Links/navigation
- Row selection, expand/collapse
- Sorting, filtering, pagination

**Data features:**
- Database queries (`<cfquery>`)
- Stored procedure calls (`<cfstoredproc>`)
- Session/URL parameter usage
- Form submissions and their targets

### Step 5: Extract Sub-features

For each feature, note specifics as bullet points:
- What data is displayed or collected
- Data source (query name, stored procedure, session variable)
- Validation rules
- Default values
- Conditional behavior (`<cfif>` logic)
- Styling that implies functional meaning (e.g., red = overdue)

## What to Look For in ColdFusion Files

### Data Sources
```cfm
<!--- Inline query --->
<cfquery name="getOrders" datasource="#APPLICATION.dsn#">
    SELECT * FROM WorkOrders WHERE status = 'active'
</cfquery>

<!--- Stored procedure --->
<cfstoredproc procedure="sp_GetWorkOrders" datasource="#APPLICATION.dsn#">
    <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#SESSION.userId#">
    <cfprocresult name="orders">
</cfstoredproc>
```

Document these as: "Data source: query `getOrders` / stored procedure `sp_GetWorkOrders`"

### Form Submissions
```cfm
<form action="saveQuantity.cfm" method="post">
    <input type="hidden" name="woID" value="#orders.woID#">
    <input type="text" name="quantity">
    <input type="submit" value="Save">
</form>
```

Document: target file, fields submitted, hidden fields (these carry context).

### Conditional Logic
```cfm
<cfif SESSION.role EQ "supervisor">
    <!--- supervisor-only controls --->
</cfif>
```

Document: what conditions control visibility/behavior, and what changes.

### JavaScript Behavior
Look for `<script>` blocks and inline event handlers (`onclick`, `onchange`, etc.). 
These often contain important UI behavior that isn't obvious from the HTML alone:
- AJAX calls (jQuery `$.ajax`, `$.get`, `$.post`)
- Dynamic show/hide logic
- Client-side validation
- Keyboard shortcuts or navigation

### Included Files
```cfm
<cfinclude template="includes/header.cfm">
<cfinclude template="includes/wo_functions.cfm">
```

Note these in the screen doc header under "Source file(s):" — they may contain shared 
functions, queries, or UI fragments used across multiple screens.

## Output Checklist

For each screen, confirm you've captured:
- [ ] Screen name and source file paths
- [ ] All visual sections identified
- [ ] Each feature within sections documented
- [ ] Data sources noted (queries, stored procs, session vars)
- [ ] Form targets and fields documented
- [ ] Conditional/role-based behavior noted
- [ ] JavaScript behavior captured
- [ ] Included files listed
- [ ] Cross-references to other screens added as wikilinks
