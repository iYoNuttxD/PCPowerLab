export const selectedUsageProfileStorageKey = 'pcpowerlab-selected-usage-profile';

export function inferUsageSettingsFromProfile(profile) {
  const weights = profile?.weights || {};
  const cpu = Number(weights.cpu || 0);
  const gpu = Number(weights.gpu || 0);
  const ram = Number(weights.ram || 0);
  const storage = Number(weights.storage || 0);
  const costBenefit = Number(weights.costBenefit || 0);

  let usageType = 'general';
  if (gpu >= cpu && gpu >= ram && gpu >= storage) {
    usageType = 'gaming';
  } else if (cpu >= 30 && ram >= 20 && storage >= 15) {
    usageType = 'programming';
  } else if (cpu >= 28 && gpu >= 25 && ram >= 18) {
    usageType = 'video-editing';
  } else if (ram >= 25 || storage >= 25) {
    usageType = 'work';
  }

  let priority = 'balanced';
  if (costBenefit >= 20) {
    priority = 'cost-benefit';
  } else if (cpu + gpu >= 65) {
    priority = 'performance';
  }

  return { usageType, priority };
}

export function persistSelectedUsageProfile(profileId) {
  try {
    localStorage.setItem(selectedUsageProfileStorageKey, profileId);
  } catch (_error) {
    // Persistência é apenas conveniência de navegação.
  }
}

export function consumeSelectedUsageProfile() {
  try {
    const profileId = localStorage.getItem(selectedUsageProfileStorageKey);
    localStorage.removeItem(selectedUsageProfileStorageKey);
    return profileId || '';
  } catch (_error) {
    return '';
  }
}
