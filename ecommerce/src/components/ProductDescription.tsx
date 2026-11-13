import { formatProductDescriptionBlocks } from "@/lib/product-description";

type ProductDescriptionProps = {
  description: string;
  sanitizedHtml?: string;
  labelClassName?: string;
  bulletClassName?: string;
};

export default function ProductDescription({
  description,
  sanitizedHtml,
  labelClassName = "text-[var(--page-fg)]",
  bulletClassName = "text-[var(--secondary)]",
}: ProductDescriptionProps) {
  const richTextClasses = "min-w-0 max-w-full space-y-3 overflow-x-auto break-words [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_b]:font-semibold [&_a]:text-[var(--secondary)] [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[#e6e6e6] [&_th]:bg-[#f5f5f5] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[#e6e6e6] [&_td]:px-3 [&_td]:py-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#eaded3] [&_blockquote]:pl-4 [&_img]:max-w-full [&_img]:h-auto";

  if (sanitizedHtml) {
    return <div data-product-description className={richTextClasses} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }

  const blocks = formatProductDescriptionBlocks(description);
  return (
    <div data-product-description className="space-y-3 break-words">
      {blocks.map((block, index) => block.type === "label" ? (
        <p key={`${block.label}-${index}`}>
          <span className={`font-semibold ${labelClassName}`}>{block.label}: </span>{block.text}
        </p>
      ) : block.type === "bullet" ? (
        <p key={`bullet-${index}`} className="flex gap-2">
          <span aria-hidden="true" className={`mt-0.5 ${bulletClassName}`}>&bull;</span><span>{block.text}</span>
        </p>
      ) : <p key={`text-${index}`}>{block.text}</p>)}
    </div>
  );
}