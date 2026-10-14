// Establish results through the same requests and state transitions as the UI.
// Persisted analysis snapshots are intentionally discarded on startup.
export async function mockWizardAnalysis(page, {
  compatibility = { compatible: true, alerts: [] },
  bottlenecks = { hasBottleneck: false, bottlenecks: [], performanceSummary: {} }
} = {}) {
  const ok = (route, data) => route.fulfill({ json: { success: true, data } });
  await page.route('**/api/v1/compatibility/check', route => ok(route, compatibility));
  await page.route('**/api/v1/compatibility/alerts', route => ok(route, compatibility));
  await page.route('**/api/v1/budget', route => {
    const input = route.request().postDataJSON();
    return ok(route, { ...input, amount: Number(Number(input.amount).toFixed(2)), warnings: [] });
  });
  await page.route('**/api/v1/bottlenecks/analyze', route => ok(route, bottlenecks));
}
