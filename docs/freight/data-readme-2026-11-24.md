# Freight sales demo data

## How the data was made

Synthetic demo data for a freight sales overview page. Every company and person name, id and code is
generated (country and port names are the exception, see Geography); amounts and volumes are scaled with
random factors. Nothing here names a real company or person.

- Window: dates 2025-12-01 to 2026-10-31, six companies. The demo calendar ends 2026-10-31: no shipment
  has an operational date and no posting an accounting date after it.
- Names: client, shipper and consignee company names are built from made-up word stems plus generic industry words
  and legal forms; person names from mixed first and last name lists. One mapping per kind, used in every
  table, so the same entity has the same name everywhere.
- Codes: shipment ids are sequential per year; company codes are CO- plus a reassigned country code;
  origin and destination codes are reassigned; the trade lane is rebuilt from them; ledger accounts are
  sequential numbers; business-unit codes in the line of business columns are shown as LOB-A to LOB-D.
- Geography: origin / destination country names and airport / port names are real (public geography).
  They are not derived from the reassigned origin and destination codes, so the two do not match.
- Dates: creation, operational, accounting, loading, departure, arrival, invoice and closing dates are real
  dates of the shipments kept; only the operational and accounting dates are capped at 2026-10-31.
- Counts: per client a random share (55 to 95 %) of its shipments is kept; postings follow their shipment.
- Amounts: per client a random factor (0.4 to 1.6) times a per-shipment factor (plus or minus 15 %).
  Gross profit = scaled revenue x the row's margin x a factor (plus or minus 15 %), capped below revenue;
  postings and shipment figures of the same shipment use the same factors, so they still agree.
  Local amounts = USD x a fixed demo rate per company (not a real exchange rate), for expected and booked
  revenue and profit alike.
- Volumes: client factor x per-shipment factor (plus or minus 15 %); TEU and truck counts rounded to
  whole units.
- A fixed seed makes the build repeatable.

Column names follow the demo model.

## Files

| File | Model table | Rows | Grain |
|---|---|---|---|
| `shipments.parquet` | `__SHIPMENTS` | 66,131 | one row per shipment id (duplicates flagged by _check_dub) |
| `postings.parquet` | `__POSTINGS` | 468,668 | one row per shipment id x accounting date x type x account |
| `client_name_dim.parquet` | `CLIENT_NAME_DIM` | 6,979 | one row per client |
| `account_manager_dim.parquet` | `ACCOUNT_MANAGER_DIM` | 329 | one row per account manager (+ NA) |
| `sales_person_name_dim.parquet` | `SALES_PERSON_NAME_DIM` | 399 | one row per sales person (+ NA) |
| `company_dim.parquet` | `COMPANY_DIM` | 6 | one row per company code |
| `origin_dim.parquet` | `ORIGIN_DIM` | 122 | one row per origin code (+ NA) |
| `destination_dim.parquet` | `DESTINATION_DIM` | 189 | one row per destination code (+ NA) |

### shipments.parquet

| Column | Type | Meaning |
|---|---|---|
| `_shipment_serial` | VARCHAR | shipment id, generated (DMO-YY-NNNNNN; YY = year of the first date) |
| `_client_name` | VARCHAR | client company, generated name |
| `_acc_manager` | VARCHAR | account manager, generated person name |
| `_sales_person` | VARCHAR | sales person, generated person name |
| `_oper_user` | VARCHAR | ops desk user, generated person name |
| `_doc_user` | VARCHAR | documentation user, generated person name |
| `_company` | VARCHAR | operating company / branch code, generated (CO-xxx) |
| `_origin` | VARCHAR | origin country code, reassigned (3 letters) |
| `_destination` | VARCHAR | destination country code, reassigned (3 letters) |
| `_trade_lane` | VARCHAR | origin-destination, built from the two reassigned codes |
| `_shipper` | VARCHAR | shipper company, generated name (same name as the client when the party is a client) |
| `_consignee` | VARCHAR | consignee company, generated name (same rule as shipper) |
| `_creation_date` | DATE | shipment creation date |
| `_oper_date` | DATE | operational date (date axis for expected figures) |
| `_loading_date` | DATE | loading date (real date) |
| `_etd` | DATE | estimated time of departure (real date) |
| `_eta` | DATE | estimated time of arrival (real date) |
| `_arrival_date` | DATE | actual arrival date (real date) |
| `_last_invoice_date` | DATE | date of the latest invoice (real date) |
| `_fin_closed_date` | DATE | date the shipment was financially closed (real date) |
| `_origin_country` | VARCHAR | origin country name (real geography, not linked to _origin) |
| `_origin_port` | VARCHAR | origin airport / port name (real geography) |
| `_destination_country` | VARCHAR | destination country name (real geography, not linked to _destination) |
| `_destination_port` | VARCHAR | destination airport / port name (real geography) |
| `_fin_status` | VARCHAR | financial status code |
| `_oper_status` | VARCHAR | operational status code |
| `_line_of_business` | VARCHAR | line of business (business-unit codes shown as LOB-A to LOB-D) |
| `_service_type` | VARCHAR | service type code |
| `_shipment_type` | VARCHAR | shipment type code |
| `_shipping_terms` | VARCHAR | Incoterm |
| `_analytical_units` | VARCHAR | unit of _analytical_volume (TEU, CBM, KG, LTL, FTL, NA) |
| `_check_dub` | BIGINT | 1 = first row of a shipment id, > 1 = duplicate row |
| `_expected_revenue_usd` | DOUBLE | expected revenue, USD |
| `_expected_revenue_local` | DOUBLE | expected revenue, local currency (USD x the company's fixed demo rate) |
| `_expected_profit_usd` | DOUBLE | expected gross profit, USD |
| `_expected_profit_local` | DOUBLE | expected gross profit, local currency |
| `_actual_revenue_usd` | DOUBLE | booked revenue, USD |
| `_actual_revenue_local` | DOUBLE | booked revenue, local currency (USD x the company's fixed demo rate) |
| `_actual_profit_usd` | DOUBLE | booked gross profit, USD |
| `_actual_profit_local` | DOUBLE | booked gross profit, local currency |
| `_analytical_volume` | DOUBLE | volume in _analytical_units |
| `_vol_cbm` | DOUBLE | volume, cubic metres |
| `_vol_teus` | DOUBLE | volume, TEU |
| `_vol_charge_weight` | DOUBLE | chargeable weight, kg |

### postings.parquet

| Column | Type | Meaning |
|---|---|---|
| `_ship_serial` | VARCHAR | shipment id, same ids as shipments._shipment_serial |
| `_accounting_date` | DATE | accounting date of the posting (date axis for actual figures) |
| `_type` | VARCHAR | Revenue or Cost |
| `_account` | BIGINT | ledger account, sequential number |
| `_amount_usd` | DOUBLE | posting amount, USD (cost rows negative) |
| `_amount_local` | DOUBLE | posting amount, local currency (USD x the company's fixed demo rate) |
| `_client_name` | VARCHAR | client company, generated name |
| `_acc_manager` | VARCHAR | account manager, generated person name |
| `_sales_person` | VARCHAR | sales person, generated person name |
| `_doc_user` | VARCHAR | documentation user, generated person name |
| `_company` | VARCHAR | operating company / branch code, generated (CO-xxx) |
| `_origin` | VARCHAR | origin country code, reassigned (3 letters) |
| `_destination` | VARCHAR | destination country code, reassigned (3 letters) |
| `_trade_lane` | VARCHAR | origin-destination, built from the two reassigned codes |
| `_shipper` | VARCHAR | shipper company, generated name (same name as the client when the party is a client) |
| `_consignee` | VARCHAR | consignee company, generated name (same rule as shipper) |
| `_has_shipment` | BIGINT | 1 = posting belongs to a shipment record |
| `_line_of_business` | VARCHAR | line of business (business-unit codes shown as LOB-A to LOB-D) |
| `_line_of_business_gl` | VARCHAR | line of business code on the ledger posting (LOB-A to LOB-D) |
| `_service_type` | VARCHAR | service type code |
| `_service_direction` | VARCHAR | service direction code |
| `_ship_type` | VARCHAR | shipment type code |
| `_fin_status` | VARCHAR | financial status code |
| `_oper_status` | VARCHAR | operational status code |

### client_name_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_client_name` | VARCHAR | client company, generated name |
| `_company_list` | VARCHAR | comma-separated company codes the client ships with in this data set |
| `_is_internal` | VARCHAR | Internal = group company booked as a client, Client = external client |

### account_manager_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_acc_manager` | VARCHAR | account manager, generated person name |

### sales_person_name_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_sales_person` | VARCHAR | sales person, generated person name |

### company_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_company` | VARCHAR | operating company / branch code, generated (CO-xxx) |

### origin_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_origin` | VARCHAR | origin country code, reassigned (3 letters) |

### destination_dim.parquet

| Column | Type | Meaning |
|---|---|---|
| `_destination` | VARCHAR | destination country code, reassigned (3 letters) |
