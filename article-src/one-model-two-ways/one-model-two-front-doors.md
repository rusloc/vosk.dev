# One model, two front doors: Power BI and Excel from a single source of truth

Every BI team knows this situation. You ship a clean Power BI report, and a week later the
operations team is back in Excel. They aren't wrong. Excel is where they add up two cells, tack on a
helper column, pivot something quickly, and get on with their day. The report is where they look.
Excel is where they work.

The usual fix is "Export data" or "Analyze in Excel". Both work, and both leave you with no say over
what lands in the sheet. Column names, column order and which columns appear at all are decided per
user, per export, per mood. Six weeks later there are nine versions of "the tracker", and none of them
match.

Here is the setup I use instead. One place holds the code, one semantic model holds the data, and
there are two front doors: Power BI for reading, Excel for working. Both show the same default view,
which I control.

## The shape of it

```
 DWH (Postgres)                 Fabric semantic model "Tracker"          Consumers
 ──────────────────────         ───────────────────────────────          ─────────────────────
 analytical SQL views   ──►     flat tables (the data)           ──►     Power BI report
 sql_source table       ──►     DAX_SOURCE (one cell: raw DAX)   ──►     Excel via Power Query
   rows: SQL per page                                                     1. read the DAX
   row:  'DAX SRC'                                                        2. run it, get the flat table
```

Three layers, one rule: **the logic lives upstream and everything else just reads it.**

## 1. SQL lives in a table, not in the model

The analytical queries sit on top of the DWH, and their text is stored in a plain table,
`sql_source`: one row per report page, with the SQL in a `_code` column. The semantic model reads its
partitions from there. It doesn't carry the SQL; it fetches it.

I write every query in DBeaver, my IDE of choice, and wrap it in a Postgres session variable. Dollar
quoting means no escaping, and the file stays pasteable:

```sql
set dev.tracker_dax =
$code$

    -- query text goes here, untouched

$code$;

update sql_source
set  _code    = current_setting('dev.tracker_dax')
    ,_updated = now()
where 1=1
    and _report = 'TRACKER'
    and _page   = 'DAX SRC';
```

Run the file, the row updates, and the next model refresh picks it up. The `.sql` files are in git, so
every column change has a diff, an author and a date. That's boring in the best way.

## 2. One extra row: the DAX that defines "the Excel view"

This is the part that makes the rest work. Next to the SQL rows, `sql_source` holds one more row whose
`_code` isn't SQL at all. It's a **raw DAX query**:

```dax
EVALUATE
SELECTCOLUMNS (
    '_TRACKER_VIEW_'
    ,"PO #",            '_TRACKER_VIEW_'[_po_no]
    ,"Supplier",        '_TRACKER_VIEW_'[_supplier_name]
    ,"ETD",             '_TRACKER_VIEW_'[_ptd]
    ,"ETA",             '_TRACKER_VIEW_'[_pta]
    ,"Status",          '_TRACKER_VIEW_'[_status]
)
ORDER BY
    [PO #]
    ,[ETD]
```

The model loads that row as a one-row, one-column table, `DAX_SOURCE[_code]`. So the model carries
its own "recipe" for the flat Excel view: business-friendly column names, the column set, the order.
That recipe is managed exactly like every other query, from the same IDE, in the same git repo.

## 3. Excel reads the recipe, then cooks with it

The workbook connects to the published semantic model through its XMLA endpoint with
`AnalysisServices.Database`. The Power Query does two hops against the same model:

```m
let
    _server   = "powerbi://api.powerbi.com/v1.0/myorg/<workspace>",
    _db       = "Tracker",

    // 1. read the raw DAX from the one-cell table
    _meta     = AnalysisServices.Database(_server, _db, [
        Query          = "EVALUATE SELECTCOLUMNS ( DAX_SOURCE, ""_dax"", DAX_SOURCE[_code] )",
        Implementation = "2.0"
    ]),
    _dax      = Text.Trim(Table.Column(_meta, Table.ColumnNames(_meta){0}){0}),

    // 2. run that DAX against the same model
    _src      = AnalysisServices.Database(_server, _db, [
        Query          = _dax,
        Implementation = "2.0"
    ]),

    // tidy up: DAX returns "[Col]" headers, datetimes become dates
    _names    = Table.TransformColumnNames(_src, (x) => Text.Remove(x, {"[", "]"})),
    _dt_cols  = Table.SelectRows(Table.Schema(_names), (x) => x[Kind] = "datetime")[Name],
    _result   = Table.TransformColumnTypes(_names, List.Transform(_dt_cols, (x) => {x, type date}))
in
    _result
```

Load it to a sheet as a table. That's it. No DAX in the workbook, and no column list in the workbook.
The workbook is a thin client.

## What this buys

- **One source of truth for logic *and* layout.** Adding, dropping, renaming or reordering a column is
  one edit in one `.sql` file. After the next model refresh, the report and every copy of the workbook
  get the same default view on their next refresh. Nobody has to email a new template around.
- **Two UIs, one dataset.** Power BI is the polished reading room: filters, visuals, drill-through.
  Excel is the workshop: pivots, custom columns, "let me just check something". Same numbers in both,
  because it's literally the same model.
- **Governed, not locked.** Users still do whatever they like on top of the flat table. The *baseline*
  is shared and agreed; their extras are their own.
- **Git-backed everything.** SQL and DAX sit side by side, reviewed and versioned the same way.

## "Why not just use Analyze in Excel, or export the matrix?"

Fair question. Both are fine for a one-off. Neither lets you **distribute a base view**. With Analyze
in Excel, every user builds their own pivot from the field list. With exports, every user gets a
snapshot of whatever visual they clicked, row limits included. There's no central place that says
"these 113 columns, named like this, in this order". Here, that place is a row in a table, and I own
it.

## Small print (learned the practical way)

- **`ORDER BY` in a DAX query needs column references.** `ORDER BY [PO #]` sorts.
  `ORDER BY "PO #"` sorts by a string constant, which means it doesn't sort at all, and nothing
  complains.
- **Native query approval.** Excel asks users to approve native database queries. With a dynamic
  query, the text can change, and the prompt comes back when it does. It's a per-user setting under
  Query Options → Security; decide your policy up front.
- **Strip the brackets.** DAX query results come back with headers like `[Supplier]`. Clean them in
  M, *before* anyone builds a pivot on top. Otherwise renaming them later breaks things.
- **Watch for ghost tables in the workbook's Data Model.** A linked table built from the sheet under
  old headers will keep refreshing and complain that "field names are no longer valid". Delete it in
  Power Pivot.
- **One query per destination, not copies.** If you load the same data to a sheet *and* to the Data
  Model, reference one query from the other rather than pasting the M twice. Copies drift.

## Bottom line

Code in the DWH, data in the semantic model, and two front doors on top. Power BI for people who read,
Excel for people who work, and one agreed default view behind both. It's not fancy, and that's the
point: the whole setup fits in a table row and a dozen lines of M, and it saves a lot of "which
version is right?" conversations.
