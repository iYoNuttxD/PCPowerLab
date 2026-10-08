# Optional cooling, approximate thermal/acoustic scenarios, compact wizard

## Scope and integration

Prepared in an isolated checkout based on published UI tree `a95cbf00ff6b2e27c00c00533b4d61833ad71a99` (publication109417). This patch changes no market/catalog records and does not publish or deploy. Apply it with the final market phase and platform-presentation patches, then test the union.

The seven required component categories remain unchanged. An optional **Refrigeração** stage follows Gabinete and precedes Orçamento; required progress still counts the original nine required steps. Review and sidebar edits link to its single form. Continuing never clears selections. Extra-fan controls start collapsed unless selected.

Wizard context is concise, educational copy lives under **Como escolher**, and repeated hero/selection/review/sidebar helper text is removed. Critical compatibility, missing-data and stale-analysis feedback remains. All new cooling styles are isolated in `frontend/src/styles/cooling.css`; shared global CSS is unchanged.

## Simulation scope

The **Simulação aproximada** label is always visible. This is an engineering what-if tool with explicit priors, not an empirically validated prediction or a manufacturer's specification.

- Ten active CPU profiles and five cooler profiles compose43 socket-compatible combinations; seven combinations are socket-incompatible
- CPU heat scenarios are25%,60%,100% of a configured reference wattage, not CPU utilization or measured gaming loads
- Default reference watts use nominal TDP/PBP as a scenario initializer; custom5–300W reference is supported
- Explicit inlet temperature15–35°C, default25°C; no inferred case-air temperature
- Fan presets50/75/100% nominal RPM, not PWM duty
- Temperature uses CPU plus cooler only. Case and extra fans are not thermal inputs
- Noise uses one complete cooler assembly plus installed physical extra-fan units (pack quantity × units per pack), with fixed1m assumed A-weighted SPL geometry
- Both AIO priors include stock radiator fans, pump2800rpm and VRM fan2500rpm once
- Unknown selected sources and unmodelled case-included fans produce a visible partial-noise subtotal. GPU/PSU/storage/electrical noise and room background are outside scope
- Unknown CPU thermal limits remain unknown. Algebraic ranges that exceed a known limit are visibly censored at the chart boundary with a “+”/limit warning, never presented as predicted above-limit operating temperatures
- No time curves, throttling-to-FPS mapping, accuracy percentages or universal brand/air/AIO ranking

Ranges are explored assumptions, not confidence intervals or guaranteed extrema. Central traces and5°C display bands avoid spurious precision. Acoustic UI displays whole dBA; internal arithmetic retains precision.

## Model data and mathematics

Reviewed numerical files live under `frontend/src/data/cooling-model/`. Manufacturer facts, source observations and all author-selected coefficients are separately identified. `model-manifest.json` records version/provenance and the corrected canonical BK042 brand; the research snapshot itself remains unchanged.

Steady-state scenario: `T = inlet + Q × (shared package/contact prior + cooler resistance grid)`.

The generic package/contact prior is0.10/0.20/0.30°C/W across CPUs. This is an explicit anchor, not calibrated per-CPU resistance; equal heat loads on the same cooler can yield equal values. Cooler heat/RPM grids are source-informed design priors with wide overlapping bands and explicit assumption-extension warnings. Piecewise interpolation uses the reviewed grid, including high-load increments once.

Noise: `10log10(sum(physicalCount × 10^(source dBA/10)))`, independently for each band. Interpolation occurs in acoustic energy and includes sparse intermediate RPM nodes. A cooler assembly is quantity1 regardless of its stock fan count. Zero sources return no total, not0dBA. Duplicate imported fan rows are ambiguous and excluded with partial coverage instead of silently double-counted.

Profiles bind to canonical ID, identity and frozen technical-spec signature. A renamed/changed model or relevant spec requires revalidation; a price/photo/attribution-note refresh does not alter physics. Imported unknown components never inherit a similarly named profile silently.

Primary methodology: [TI thermal metrics](https://www.ti.com/lit/an/slua844b/slua844b.pdf), [Noctua CPU-specific cooling discussion](https://www.noctua.at/en/expertise/guides/noctua-standardised-performance-rating), [OSHA acoustic energy addition](https://www.osha.gov/otm/section-3-health-hazards/chapter-5). Exact product/reference links are retained with each selected profile. These sources do not validate this simulator's numerical accuracy.

The i7-13700K + Pure Rock3Black measured reference remains optional under **Ver referência medida deste par**. It no longer gates simulation availability. Its190W row is a configured test condition, not measured package power; using it as an anchor is not independent validation.

## State and component API

`CoolingSimulationPanel({ cpu, cooler, fans, caseComponent, conditions, onConditionsChange })`

Use selected components, `build.coolingConditions` and `build.actions.setCoolingConditions`. Conditions persist in the local working build with model version, reset on loading another saved build/clear build, and restore defaults if stored data is malformed or obsolete. Live invalid inputs remain invalid, with visible field errors; values are never silently clamped.

Simulation recomputes directly from its inputs. What-if controls do not mutate components, budget, catalog facts or unrelated API analyses. Cooler/fan selection still uses existing actions, preserving normal analysis invalidation. Backend saved-build/export schemas are unchanged; those exports do not include this new local scenario, disclosed in model details.

The pure engine exports conditions normalization, identity/signature helpers and `simulateCooling`. Thermal signatures exclude case/extra fans, and noise signatures exclude CPU heat/inlet, so outputs can be invalidated independently without stale reuse.

## Verification and acceptance

Independent numerical review of the frozen ledger found ordered/monotone bands across76,500 sampled heat/speed cases, all43/7 pairing classifications, consistent AIO energy sums and physical-pack arithmetic. This verifies mathematical consistency, not empirical prediction accuracy.

Isolated app checks include engine/unit regressions, root/frontend lint, production build, SSR rendering and Playwright collection. Actual browser execution is delegated to the user's Mac; cloud Chromium cannot create its required singleton socket. Those browser cases are not reported as passes or app failures.

Mac acceptance must cover optional skip/back/refresh/direct edit, saved/current selections, input persistence/reset, invalid values, supported/incompatible/edited identities, missingTjmax, over-limit display, extra-fan thermal invariance, acoustic partials/pack counts, model disclosures, keyboard/focus, mobile overflow and repeated navigation. Run aggregate tests again on the final market/platform/synthetic-score union.

## Reviewed edge corrections

Thermal, cooler-noise and extra-fan-noise inputs now validate independently. An invalid extra-fan speed or quantity never suppresses or changes valid CPU/cooler thermal output/signature; valid acoustic sources remain an explicitly partial subtotal. Invalid inlet/power conditions do not suppress unrelated valid acoustic output. Shared model-version/unknown-input errors remain rejected.

Cache signatures preserve invalid/null states rather than coalescing them into valid quantity1 or stopped:false defaults, including malformed case metadata. Stock-cooler fit-only CPU metadata does not invalidate an explicitly selected aftermarket profile; no stock thermal/acoustic model is inferred.

Final direct identity check uses corrected51f70 catalog snapshot tree `dd925bc8ba4630e5d323bd74218f6341d5b86b90`:10 CPUs,5 coolers,4 fans;43 compatible model/socket pairs and7 socket mismatches. BK042 brand is be quiet!. These counts do not establish case clearance, radiator positioning or full physical compatibility, which remain separate checks.
