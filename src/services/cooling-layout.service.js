// Positional layouts describe alternatives at each position, never additive holes.
export function evaluateFanLayout(caseSpecs, selectedByDiameter, radiator) {
  const entries = Object.entries(caseSpecs.fanLayouts || {});
  if (!entries.length) return null;
  const positions = entries.map(([position, layouts]) => ({ position, options: Array.isArray(layouts) ? layouts.map(layout => {
    const match = /^(\d+)x(\d+)$/.exec(layout);
    return match && Number(match[1]) > 0 && Number(match[2]) > 0
      ? { capacity: Number(match[1]), diameter: Number(match[2]) } : null;
  }) : [] }));
  if (positions.some(({ options }) => !options.length || options.some(option => !option))) return null;
  const included = caseSpecs.includedFanCount;
  if (!Number.isInteger(included) || included < 0) return null;
  const demand = new Map(selectedByDiameter);
  if (included) {
    if (!positions.some(({ position }) => position === caseSpecs.includedFansPosition)) return null;
    if (!Number.isFinite(caseSpecs.includedFanDiameterMm) || caseSpecs.includedFanDiameterMm <= 0) return null;
    demand.set(caseSpecs.includedFanDiameterMm, (demand.get(caseSpecs.includedFanDiameterMm) || 0) + included);
  }
  if (radiator) demand.set(radiator.diameter, (demand.get(radiator.diameter) || 0) + radiator.count);
  const radiatorPositions = radiator ? positions.filter(({ position }) =>
    Array.isArray(caseSpecs.radiatorLayouts?.[position]) && caseSpecs.radiatorLayouts[position].includes(radiator.size)
      && (!radiator.positions || radiator.positions.includes(position))
  ).map(({ position }) => position) : [null];
  if (radiator && !radiatorPositions.length) return null;
  // Search all documented alternatives. A possible allocation proves only nominal
  // occupancy; thickness, GPU/RAM clearances and actual placement remain separate.
  function fits(index, available, radiatorPosition) {
    if (index === positions.length) return [...demand].every(([diameter, count]) => count <= (available.get(diameter) || 0));
    const { position, options } = positions[index];
    return options.some(option => {
      const reserved = (position === radiatorPosition ? radiator.count : 0)
        + (position === caseSpecs.includedFansPosition ? included : 0);
      if (position === radiatorPosition && option.diameter !== radiator.diameter) return false;
      if (included && position === caseSpecs.includedFansPosition && option.diameter !== caseSpecs.includedFanDiameterMm) return false;
      if (reserved > option.capacity) return false;
      const next = new Map(available);
      next.set(option.diameter, (next.get(option.diameter) || 0) + option.capacity);
      return fits(index + 1, next, radiatorPosition);
    });
  }
  return radiatorPositions.some(position => fits(0, new Map(), position));
}
