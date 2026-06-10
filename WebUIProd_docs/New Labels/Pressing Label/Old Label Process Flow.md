
Here are the old Crystal Reports label files:

| Process                     | Report File                                         |
| --------------------------- | --------------------------------------------------- |
| **PRESS**                   | `stp-PressingLabel4x6_003.rpt`                      |
| **CNC**                     | `STP-MachiningLabel4x6_002.rpt`                     |
| **SAND**                    | `STP-SandingLabel4x6_001.rpt`                       |
| **PACK**                    | `STP-PackagingtoAssemblyLabel4x6_SKID_002.rpt`      |
| **Finished Product**        | `STP-ProduitFiniListeContenantNew4x6.rpt`           |
| **Finished Product Detail** | `STP-ProduitFiniListeContenantNew4x6Detail_002.rpt` |

There are also sample generated PDFs in `src/old/EcransSeatPly/externe/etiquettes/` if you want to open those as references.


---

## Label Preview Flow

### Step 1 — Printer icon click (`Header.tsx:108`)

The "Tag" icon in the header sets `activeModal = "label"`, which opens `<LabelPrintingModal>` passing `transac` and `copmachine` from the URL.

---

### Step 2 — Modal opens → fetch label list (`LabelPrintingModal.tsx:56-84`)

A `useEffect` fires on `open && transac`, calling `getOrderLabels(transac, copmachine)` → `GET getOrderLabels.cfm`. This populates the two tables (Finished Products and Operations).

---

### Step 3 — User clicks the printer icon on a row (`lines 248-250 / 312-314`)

This calls `handlePreview("pack" | "operation", key)`.

---

### Step 4 — `handlePreview` runs (`lines 102-118`) — **this is the slow part**

```ts
setIsPdfLoading(true);
setPreviewPdfUrl(null);           // clears previous preview immediately
setActivePreviewKey(`${type}-${key}`);
const res = await getLabelPdf(type, key, lang);  // async fetch
setPreviewPdfUrl(res.data.pdfUrl);
setIsPdfLoading(false);
```

The fetch hits `getLabelPdf.cfm`, which does **multiple slow operations on the CF server**:

1. Determines the report template file based on operation type (PRESS/CNC/SAND/PACK)
2. Queries the DB for AutoFAB service connection info
3. Builds a **SOAP XML request** to an external AutoFAB print service
4. **POSTs** to the AutoFAB service to generate the PDF
5. Parses the XML response to extract the PDF URL
6. Returns `{ pdfUrl: "...path/to/generated.pdf" }`

This whole round-trip (DB query + SOAP call + report generation) is the primary latency source.

---

### Step 5 — iframe loads the PDF (`lines 341-367`)

Once `pdfUrl` is set, React renders:

```tsx
<iframe src={`${previewPdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full" />
```

The browser then **fetches and renders the PDF file** inside the iframe — another network round-trip to download the actual PDF bytes.

---

## Where the latency comes from

|Step|Cause|
|---|---|
|`getLabelPdf.cfm` network call|DB query + SOAP request to AutoFAB service|
|AutoFAB report generation|External service generates PDF on demand|
|`iframe` PDF download|Browser fetches and renders the PDF file|

The biggest delay is almost certainly the **SOAP call to AutoFAB** in `getLabelPdf.cfm` — that external service generates the PDF synchronously before returning the URL. There's no caching, pre-generation, or optimistic loading — every click waits for the full round-trip.

explain to me now the external print service. what does it do?

Read getLabelPdf.cfm ColdFusion query file

Read getLabelPdf.cfm ColdFusion query file

Here's what the external print service does:

---

## AutoFAB Print Service

**AutoFAB** is an internal Windows application (likely a .NET/COM service) that acts as a Crystal Reports rendering engine. It exposes a SOAP HTTP API on the local network.

### What it does when called

1. **Receives a `PRINT_REPORT` SOAP request** containing:
    
    - `SRAPPORT` — full filesystem path to a Crystal Reports `.rpt` template file (e.g. `D:\NBA\AUTOFABTEST\rapport\stp-PressingLabel4x6_003.rpt`)
    - `SCLE` / `SUNIQUE` — the record key (TJSEQ or TRSEQ_EPF) used to query the data
    - `SLANGUE` — language (1=FR, 2=EN)
    - `SCIBLE=4` + `SPARAMCIBLE=LABEL;PDF` — instructs it to render as PDF (not to a printer)
2. **Generates a PDF** by opening the `.rpt` Crystal Report template, connecting to the database, fetching the row identified by the key, and rendering it as a PDF file saved to a shared folder (`D:\NBA\AUTOFABTEST\rapport\` on the server, exposed as `http://10.4.80.6/AUTOFAB_RAPPORTS_TEST/`)
    
3. **Returns an XML response** (not wrapped in SOAP) with:
    
    - `nRetJob` — a job/return code (negative = error)
    - `URL` — the filename of the generated PDF
4. **CF then constructs the public URL**: `http://10.4.80.6/AUTOFAB_RAPPORTS_TEST/{URL}` and returns it to the browser.
    

---

## The hardcoded 2-second sleep

There's a critical detail on line 106:

```cfm
<cfset sleep(2000)>
```

After POSTing to AutoFAB, the code **always waits 2 full seconds** before even trying to parse the response. This is an artificial delay baked in — probably a workaround because the service responds before the PDF file is actually written to disk. The sleep ensures the file exists by the time the browser tries to load it in the iframe.

---

## Why it's slow — summary

|Cause|Latency|
|---|---|
|DB query to look up `OPERATION_OPCODE`|~50–200ms|
|DB query to get AutoFAB IP/port|~50ms|
|SOAP call to AutoFAB (Crystal Reports rendering)|~500ms–2s|
|**Hardcoded `sleep(2000)`**|**exactly 2000ms always**|
|`iframe` fetching the generated PDF over HTTP|~100–500ms|
|**Minimum total**|**~2.7–5+ seconds**|

The `sleep(2000)` alone guarantees a minimum 2-second wait on every single label click, regardless of how fast AutoFAB actually is.