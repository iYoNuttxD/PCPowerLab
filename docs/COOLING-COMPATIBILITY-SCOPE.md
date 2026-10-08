# Cooling fit and core compatibility

`compatibility.status` and `compatible` retain the existing core-build contract.
When no aftermarket cooler is selected and included-cooler identity/specifications
are unavailable, they do **not** prove cooling fit. Consumers must also display
`coolingAssessment`, using “Refrigeração não verificada” for unknown cooling.
This keeps existing seven-slot builds, recommendations and ready presets usable
without inventing a mandatory purchase. No component or price is added.

`coolingAssessment` contains `status`, `scope`, `alerts`, and `unverifiedChecks`.
Scopes are `cooling_not_assessed`, `selected_cooler`, and `included_cooler`.
It is serialized by compatibility check/alerts, build summaries and ready-build
compatibility objects; recommendation responses expose it at their root.
Explicit aftermarket or verified included-cooler failures still participate in
core compatibility. Missing thermal facts never become positive cooling evidence.

The optional verified-stock contract is CPU `specs.includesCpuCooler: true` plus
`specs.includedCpuCooler: {name, specSourceUrl, specs}`. Its `specs` use the existing
cooler fields (`coolingType`, `supportedSockets`, `heightMm`). This evaluates fit
without creating a purchasable item; an explicit selected cooler takes priority.
No current CPU is assigned invented stock-cooler identity or dimensions.

Fan quantities are physical units: pack quantity × units per pack. Included case
fans and AIO-owned fans each reserve capacity once. Position alternatives such as
2×120 OR 2×140 are searched as alternatives, never added together. Radiators
reserve a supported position, sharing that position's fan mounts. Existing fans
are retained, not silently removed or repurposed as radiator fans. Unknown or
malformed layouts stay unverified; a possible nominal allocation is not proof of
thickness, installed placement, RAM/VRM/GPU clearance or connector availability.

Manufacturer source for the current Elite 301 White positional data:
https://www.coolermaster.com/en-global/products/E301-WGNN-S00.html
Verified 2026-10-08: front 3×120, top 2×120 or 2×140, rear 1×120;
three included front 120 mm fans; front radiators 120/240, top
120/140/240/280, rear 120; air-cooler height limit 163.5 mm.
No inferred thickness limit is added.

Compact verdict consumers also retain the assessment: comparison rows and their
qualified summary text; catalog previews; upgrade suggestions; roadmap initial
compatibility and each `compatibilityAfterStep`; compatibility fixes; score
`source`; full-build simulation compatibility; and generated export summaries.
Feedback derives and stores it from the submitted `buildSnapshot` using current
catalog facts, never trusting a client-provided positive cooling claim. Incomplete
or no-longer-resolvable snapshots are explicitly unverified. Historical feedback
without a snapshot cannot acquire a fabricated assessment.

Elite 502 White E502-WGNN-S00 positional limits were checked against
https://www.coolermaster.com/en-us/products/elite-502.html on 2026-10-08:
front 3×120 or 3×140, top 3×120 or 2×140, rear 1×120; three included
front 120 mm fans. Front radiators 120/140/240/280/360/420 have a
457×140×27 mm limit; top supports up to 360 and rear 120. The front
limit is never applied to top candidates. Unknown top clearances remain unknown.

Current market-case enrichment is bound to exact ID, part number and specification
source, so legacy fallback defaults cannot erase current verified cooling fields.
The two corrected case price identity snapshots receive these exact technical
specifications; observed price, merchant, source and timestamp are unchanged.
Strict price identity matching remains enabled. Stored user selections and
historical component IDs are not rewritten.
