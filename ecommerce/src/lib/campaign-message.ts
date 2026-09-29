export type CampaignMessageTemplateInput = {
  template: string;
  customerName: string;
  campaignName: string;
  couponCode: string;
  discountPercent: number;
  expiryDate?: string;
  hasReferral?: boolean;
};

function formatCampaignExpiryDate(expiryDate?: string) {
  return expiryDate
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(expiryDate))
    : "as per campaign terms";
}

export function renderCampaignMessageTemplate(input: CampaignMessageTemplateInput) {
  return input.template
    .replace(/{{#if hasReferral}}([\s\S]*?){{\/if}}/g, input.hasReferral ? "$1" : "")
    .replaceAll("{{customerName}}", input.customerName)
    .replaceAll("{{campaignName}}", input.campaignName)
    .replaceAll("{{couponCode}}", input.couponCode)
    .replaceAll("{{discountPercent}}", String(input.discountPercent))
    .replaceAll("{{expiryDate}}", formatCampaignExpiryDate(input.expiryDate))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}