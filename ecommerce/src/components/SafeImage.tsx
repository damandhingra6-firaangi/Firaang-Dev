"use client";

import Image from "next/image";
import { ImgHTMLAttributes, SyntheticEvent } from "react";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_SRC = "/FiraangLogoDesign-black.svg";
const DEFAULT_DIMENSION = 800;

function isOptimizableSource(source: string) {
  if (!source) {
    return false;
  }

  return source.startsWith("/") || source.startsWith("https://cdn.shopify.com") || source.startsWith("https://www.shopify.com");
}

export default function SafeImage({
  src,
  alt,
  onError,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  width,
  height,
  loading,
  decoding,
  sizes,
  ...rest
}: SafeImageProps) {
  const source = typeof src === "string" ? src.trim() : "";
  const resolvedSrc = source || fallbackSrc;
  const safeWidth = typeof width === "number" ? width : Number(width) || DEFAULT_DIMENSION;
  const safeHeight = typeof height === "number" ? height : Number(height) || Math.round(safeWidth * 1.25);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);

    const target = event.currentTarget;
    if (!target || target.getAttribute("data-fallback") === "true") {
      return;
    }

    target.setAttribute("data-fallback", "true");
    target.src = fallbackSrc;
  };

  if (!resolvedSrc) {
    return null;
  }

  const commonProps = {
    ...rest,
    alt: alt ?? "",
    width: safeWidth,
    height: safeHeight,
    loading: loading ?? "lazy",
    decoding: decoding ?? "async",
    onError: handleError,
  };

  if (!isOptimizableSource(resolvedSrc)) {
    return <img {...commonProps} src={resolvedSrc} />;
  }

  return (
    <Image
      {...commonProps}
      src={resolvedSrc}
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
    />
  );
}