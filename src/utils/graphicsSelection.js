// An explicit choice is required. Missing GPU alone is never an integrated PC.
export const dedicatedBuildSlots = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];
export const usesIntegratedGraphics = selection => selection?.graphicsMode === 'integrated' || selection?.components?.graphicsMode === 'integrated';
export const requiredSlotsFor = selection => dedicatedBuildSlots.filter(slot => slot !== 'gpu' || !usesIntegratedGraphics(selection));
