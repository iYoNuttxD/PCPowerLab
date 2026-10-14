# Task-focused platform review

## Presentation changes

- Catalog: search, category, price and sorting are primary. “Mais filtros” contains technical filters; applied filters and invalid ranges remain visible. Comparison appears after selection.
- Summary: parts and score are discoverable details. Budget and compatibility remain visible. Sharing, reporting and export each have one action location.
- Performance: separate game, comparison, software and temperature/noise task views retain their inputs and guarded results. Changing the current build invalidates derived results in every view.
- Ready builds: recommendation, catalog and custom profiles have separate task views. Applying a profile reveals and focuses the recommendation form.
- Upgrades: the source stays visible; one-piece and staged plans have separate views with retained fields and request state.
- Saved builds and comparisons: opening/swapping and choosing configurations precede optional actions and criteria. Secondary actions remain keyboard-accessible.
- Feedback: records precede aggregate statistics. Context and whole-build consequences remain available beside relevant actions.
- Home, rankings and administration: concise task entry points, category-scoped rankings and separate rule/parameter views. Authentication and documentary-rule warnings are unchanged.

## Required browser acceptance

Inspect at 1440, 1024, 768, 390 and 320 CSS pixels, plus 200% zoom. Source and server rendering checks do not establish visual acceptance.

1. Check consistent control geometry, wrapped labels/errors, long saved names and no page-level horizontal overflow.
2. Use keyboard arrows, Home/End and Tab through task tabs. Confirm hidden panels cannot receive focus; native disclosures open with the keyboard.
3. Change tasks during pending game/software/upgrade requests, return to results, change the build, and retry errors. A hidden or old request must never revive stale data.
4. Apply a profile from “Meus perfis”; the recommendation task must open with the selected profile and focus its heading.
5. Select catalog filters, collapse them, remove visible applied-filter chips, and compare selected components. Invalid ranges remain understandable while collapsed.
6. Open summary parts, preview a replacement, cancel, then calculate the optional score. Verify one share/report/export path and clear compatibility/missing-price states.
7. Exercise saved-build secondary actions, cancel deletion, and inspect the comparison table using keyboard scrolling.
8. Verify feedback history, linked parts, contextual submission and whole-build actions. Verify Admin login, rule/parameter tasks, add/edit/delete, expiry and logout in isolated test data.

No browser screenshots or visual acceptance are asserted by this document.

## Implementation checks

- 926 Node tests passed across backend and frontend.
- All 16 source/handler/SSR check scripts passed, including 17-route landmark rendering, independent task-session ownership and keyboard tab contracts.
- Root and frontend lint, production build and whitespace checks passed.
- Playwright collected 258 end-to-end and 18 integration cases. These cases have not yet been executed against this presentation change.
- Independent negative controls caught lost game-session persistence, stale request ownership and broken keyboard navigation. The updated task sessions retain successful per-mode results across navigation and invalidate them when the build changes.

The production build still reports its existing large-chunk advisory. Browser rendering, actual focus, responsive geometry and screenshots remain acceptance work.

## Tablet recommendation follow-up

A prior browser inspection found that nested recommendation cards left only a few characters of width for component names at 1024 and 768 pixels. Part identities now occupy the full card row, with compact product photos and a wider recommendation-card minimum. Reinspect three simultaneous R$ 5,000–6,000 recommendations at all five widths; verify natural word wrapping, full model names and no page overflow. A browser geometry regression covers name widths and row allocation; execution and visual acceptance are pending.


## Cooling integration

The optional cooling stage remains outside the nine required wizard steps. Temperature/noise scenarios also have a dedicated Performance task. Scenario settings persist with the local working build, without changing API game results or selecting hardware automatically. Outputs are approximate bands with stated assumptions; fan quantities affect selected-source acoustics, not the CPU-plus-cooler thermal estimate. Missing physical cooling evidence stays visibly qualified as “Refrigeração não verificada”, including core-compatible presets and results.

## Cooling selection revision

Cooler and extra-fan choices use the same visual product cards as the component catalog, including images, prices and details. Pack quantities and removal stay beside selected fan cards. Selection contains no temperature/noise charts. The existing scenario panel is shown in Summary, reached by “Ver temperatura e ruído” from review; Performance retains its analysis task. Both views share the same local scenario settings.

The saved-build deletion dialog explicitly focuses Cancel after native dialog opening. Browser selectors and optional-stage navigation were reconciled with the current controls; repeated-task request checks retain an exact settled baseline. Browser and visual verification of this revision remain pending.

Revision checks: 933 Node tests, all 16 source/handler/SSR scripts, both lints and production build pass. The browser suite collects 268 end-to-end and 18 integration cases; collection is not execution. Actual browser focus, card geometry and Summary anchor behavior remain pending on the next publication.
