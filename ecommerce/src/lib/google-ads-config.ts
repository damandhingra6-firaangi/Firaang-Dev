export function normalizeGoogleAdsConversionId(value?: string) {
  const conversionId = value?.trim();
  if (!conversionId) {
    return undefined;
  }

  if (/^AW-\d+$/i.test(conversionId)) {
    return `AW-${conversionId.slice(3)}`;
  }

  return /^\d+$/.test(conversionId) ? `AW-${conversionId}` : undefined;
}
