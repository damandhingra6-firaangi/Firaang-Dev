import type { GridProduct, ProductSizeChart } from "@/lib/catalog";

type SizeChartRule = {
  key: string;
  handle?: string;
  titleIncludes?: string;
  chart: ProductSizeChart;
};

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

function createEmptyRows(sizeLabels: string[], columns: number) {
  return sizeLabels.map((size) => [size, ...Array.from({ length: columns - 1 }, () => "-")]);
}

const PRODUCT_SIZE_CHART_RULES: SizeChartRule[] = [
  {
    key: "tshirt-default",
    handle: "t-shirt",
    titleIncludes: "t-shirt",
    chart: {
      headers: ["Size", "Chest", "Length", "Shoulder", "To Fit Chest"],
      rows: [
        ["XS", "38", "26", "16", "34-36"],
        ["S", "40", "27", "17", "36-38"],
        ["M", "42", "28", "18", "38-40"],
        ["L", "44", "29", "19", "40-42"],
        ["XL", "46", "30", "20", "42-44"],
        ["XXL", "48", "31", "21", "44-46"],
      ],
      note: "Approximate garment measurements in inches. Slight variation may occur (+/- 0.5 in).",
    },
  },
  {
    key: "tee-default",
    handle: "tee",
    titleIncludes: "tee",
    chart: {
      headers: ["Size", "Chest", "Length", "Shoulder", "To Fit Chest"],
      rows: [
        ["XS", "38", "26", "16", "34-36"],
        ["S", "40", "27", "17", "36-38"],
        ["M", "42", "28", "18", "38-40"],
        ["L", "44", "29", "19", "40-42"],
        ["XL", "46", "30", "20", "42-44"],
        ["XXL", "48", "31", "21", "44-46"],
      ],
      note: "Approximate garment measurements in inches. Slight variation may occur (+/- 0.5 in).",
    },
  },
  {
    key: "baby-tee-default",
    handle: "baby-tee",
    titleIncludes: "baby tee",
    chart: {
      headers: ["Size", "Chest", "Length", "Shoulder", "To Fit Chest"],
      rows: [
        ["XS", "24", "14", "12", "30"],
        ["S", "26", "14.5", "12.5", "32"],
        ["M", "28", "15", "13", "34"],
        ["L", "30", "15.5", "13.5", "36"],
        ["XL", "32", "16", "14", "38"],
        ["2XL", "34", "16.5", "14.5", "40"],
      ],
      note: "*All measurements are in inches.",
    },
  },
  {
    key: "kurta-template",
    handle: "kurta",
    titleIncludes: "kurta",
    chart: {
      headers: ["Size", "Chest", "Waist", "Hip", "Length", "Shoulder", "Sleeve"],
      rows: createEmptyRows(APPAREL_SIZES, 7),
      note: "Template chart. Replace '-' with actual garment measurements in inches.",
    },
  },
  {
    key: "dress-template",
    handle: "dress",
    titleIncludes: "dress",
    chart: {
      headers: ["Size", "Bust", "Waist", "Hip", "Length", "Shoulder"],
      rows: createEmptyRows(APPAREL_SIZES, 6),
      note: "Template chart. Replace '-' with actual garment measurements in inches.",
    },
  },
  {
    key: "trousers-template",
    handle: "trouser",
    titleIncludes: "trouser",
    chart: {
      headers: ["Size", "Waist", "Hip", "Rise", "Inseam", "Outseam", "Bottom Opening"],
      rows: createEmptyRows(APPAREL_SIZES, 7),
      note: "Template chart. Replace '-' with actual garment measurements in inches.",
    },
  },
  {
    key: "pants-template",
    handle: "pant",
    titleIncludes: "pant",
    chart: {
      headers: ["Size", "Waist", "Hip", "Rise", "Inseam", "Outseam", "Bottom Opening"],
      rows: createEmptyRows(APPAREL_SIZES, 7),
      note: "Template chart. Replace '-' with actual garment measurements in inches.",
    },
  },
];

function normalize(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[_]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getConfiguredSizeChart(product: Pick<GridProduct, "name" | "handle">): ProductSizeChart | null {
  const handle = normalize(product.handle);
  const title = normalize(product.name);

  const match = PRODUCT_SIZE_CHART_RULES.find((rule) => {
    const ruleHandle = normalize(rule.handle);
    const ruleTitleIncludes = normalize(rule.titleIncludes);

    if (ruleHandle && handle && handle.includes(ruleHandle)) {
      return true;
    }

    if (ruleTitleIncludes && title.includes(ruleTitleIncludes)) {
      return true;
    }

    return false;
  });

  return match?.chart ?? null;
}

export { PRODUCT_SIZE_CHART_RULES };
