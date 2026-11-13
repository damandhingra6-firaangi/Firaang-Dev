import sanitizeHtml from "sanitize-html";
import { decodeHtmlEntities, stripProductDescriptionCss } from "./product-description";

export function sanitizeProductDescriptionHtml(description: string): string {
  const decoded = decodeHtmlEntities(description);
  if (!/<\/?[a-z][\s\S]*?>/i.test(decoded)) return "";

  return sanitizeHtml(decoded, {
    allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "div", "span", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "blockquote", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "a", "img"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan", "scope", "style"],
      td: ["colspan", "rowspan", "style"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "template", "iframe", "object", "svg", "math"],
    allowedStyles: {
      "*": {
        color: [/^#[\da-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^(black|white|gray|grey|red|blue|green)$/i],
        "background-color": [/^#[\da-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
        border: [/^[1-4]px (solid|dashed) #[\da-f]{3,8}$/i],
      },
    },
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: { ...attributes, ...(attributes.target === "_blank" ? { rel: "noopener noreferrer" } : {}) },
      }),
    },
    textFilter: stripProductDescriptionCss,
  });
}