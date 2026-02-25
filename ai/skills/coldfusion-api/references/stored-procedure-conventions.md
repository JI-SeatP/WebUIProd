# Stored Procedure Conventions

All database logic lives in stored procedures, not inline SQL in `.cfm` files. This keeps 
business logic in the database layer where it's reusable, testable, and performant.

## When to Use Stored Procedures

**Always use a stored procedure when:**
- Joining multiple tables
- Complex WHERE clauses with business logic
- INSERT, UPDATE, DELETE operations
- Aggregations or calculations
- Any query that might be reused by multiple `.cfm` files

**Inline SQL is acceptable only for:**
- Simple single-table lookups: `SELECT name FROM config WHERE key = 'version'`
- Session/config reads that don't involve business data

Even then, prefer a stored procedure if there's any chance of reuse.

## Naming Convention

```
sp_{Action}{Entity}
```

| Action | Usage | Example |
|--------|-------|---------|
| Get | Read data | `sp_GetWorkOrders` |
| Save | Insert or update | `sp_SaveProductionQuantity` |
| Delete | Soft or hard delete | `sp_DeleteWorkOrder` |
| Update | Update specific fields | `sp_UpdateOrderStatus` |
| Search | Filtered/searched query | `sp_SearchProducts` |
| Count | Aggregate counts | `sp_CountOpenOrders` |

## Parameter Handling

Always use `<cfprocparam>` with explicit `cfsqltype` — never concatenate values into SQL:

```cfm
<!--- CORRECT --->
<cfstoredproc procedure="sp_GetWorkOrders" datasource="#APPLICATION.dsn#">
    <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#shiftId#">
    <cfprocparam type="in" cfsqltype="cf_sql_varchar" value="#status#">
    <cfprocresult name="qOrders">
</cfstoredproc>

<!--- NEVER DO THIS --->
<cfquery name="qOrders" datasource="#APPLICATION.dsn#">
    SELECT * FROM WorkOrders WHERE shiftId = #shiftId# AND status = '#status#'
</cfquery>
```

## Common cfsqltype Values

| SQL Type | cfsqltype |
|----------|-----------|
| INT | `cf_sql_integer` |
| VARCHAR/NVARCHAR | `cf_sql_varchar` |
| DATETIME | `cf_sql_timestamp` |
| BIT/BOOLEAN | `cf_sql_bit` |
| DECIMAL/MONEY | `cf_sql_decimal` |
| FLOAT | `cf_sql_float` |

## Stored Procedure Template (SQL Server)

```sql
CREATE PROCEDURE sp_GetWorkOrders
    @ShiftId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        wo.woId,
        wo.woNumber,
        p.productName,
        wo.qtyRequired,
        wo.qtyProduced,
        wo.status
    FROM WorkOrders wo
    INNER JOIN Products p ON wo.productId = p.productId
    WHERE wo.shiftId = @ShiftId
        AND wo.status != 'deleted'
    ORDER BY wo.woNumber ASC;
END
```

```sql
CREATE PROCEDURE sp_SaveProductionQuantity
    @WoId INT,
    @Quantity INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE WorkOrders
        SET qtyProduced = qtyProduced + @Quantity,
            lastUpdatedBy = @UserId,
            lastUpdatedDate = GETDATE()
        WHERE woId = @WoId;

        -- Log the entry
        INSERT INTO ProductionLog (woId, quantity, userId, entryDate)
        VALUES (@WoId, @Quantity, @UserId, GETDATE());

        COMMIT TRANSACTION;

        -- Return updated total
        SELECT qtyProduced AS newTotal
        FROM WorkOrders
        WHERE woId = @WoId;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
```

## Error Handling in Stored Procedures

Always use TRY/CATCH in write operations. For read operations it's optional but recommended 
for complex queries:

```sql
BEGIN TRY
    -- your logic here
END TRY
BEGIN CATCH
    -- ROLLBACK if inside a transaction
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    
    -- Re-throw so ColdFusion's cfcatch can capture it
    THROW;
END CATCH
```

The ColdFusion `.cfm` file will catch the error via `<cfcatch>` and return it in the 
standard JSON error format.

## Null Parameter Handling

When a parameter might be null, use the `null` attribute:

```cfm
<cfprocparam type="in" cfsqltype="cf_sql_integer" 
    value="#productId#" null="#NOT len(productId)#">
```

This sends a SQL NULL when the value is empty, preventing type conversion errors.
