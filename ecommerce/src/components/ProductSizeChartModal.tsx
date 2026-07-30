"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import SafeImage from "@/components/SafeImage";

type ProductSizeChartModalProps = {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  productName?: string;
};

export default function ProductSizeChartModal({
  isOpen,
  onClose,
  image,
  productName = "Product",
}: ProductSizeChartModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Handle Escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Handle click outside modal (backdrop)
    const handleBackdropClick = (event: MouseEvent) => {
      if (dialogRef.current && event.target === dialogRef.current) {
        onClose();
      }
    };

    // Focus the close button for accessibility
    closeButtonRef.current?.focus();

    document.addEventListener("keydown", handleEscape);
    dialogRef.current?.addEventListener("click", handleBackdropClick);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
      dialogRef.current?.removeEventListener("click", handleBackdropClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-chart-modal-title"
    >
      <div className="relative w-full max-w-[700px] max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eaded3] px-5 py-4 md:px-6 md:py-5">
          <h2
            id="size-chart-modal-title"
            className="text-lg font-semibold text-[#282c3f] md:text-xl"
          >
            Size Chart
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close size chart modal"
            className="inline-flex rounded-full p-1 text-[#8e7f75] transition hover:bg-[#f4f1ed] hover:text-[#282c3f]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {image ? (
            <div className="flex flex-col items-center">
              <SafeImage
                src={image}
                alt={`${productName} Size Chart`}
                className="w-full max-w-full rounded-lg object-contain"
              />
              <p className="mt-4 text-xs text-[#6c615b] text-center">
                Click the image for a full-screen view (if your browser supports it)
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-[#f4f1ed] p-4 mb-4">
                <svg
                  className="h-8 w-8 text-[#8e7f75]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#282c3f]">
                Size chart is currently unavailable
              </p>
              <p className="mt-2 text-xs text-[#6c615b]">
                Please check back later or contact our support team for sizing information.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#eaded3] bg-[#faf9f6] px-5 py-4 md:px-6 md:py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-[#d9cfc3] bg-white px-4 py-2.5 text-sm font-semibold text-[#282c3f] transition hover:bg-[#f4f1ed]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
