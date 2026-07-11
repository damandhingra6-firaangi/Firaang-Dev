"use client";

import { ImgHTMLAttributes, SyntheticEvent, useEffect, useState } from "react";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_SRC = "/FiraangLogoDesign-black.svg";

export default function SafeImage({
  src,
  alt,
  onError,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  ...rest
}: SafeImageProps) {
  const initialSource = typeof src === "string" ? src.trim() : "";
  const [resolvedSrc, setResolvedSrc] = useState(initialSource || fallbackSrc);
  const [didFallback, setDidFallback] = useState(false);

  useEffect(() => {
    const nextSource = typeof src === "string" ? src.trim() : "";
    setResolvedSrc(nextSource || fallbackSrc);
    setDidFallback(false);
  }, [fallbackSrc, src]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);

    if (didFallback || resolvedSrc === fallbackSrc) {
      return;
    }

    setResolvedSrc(fallbackSrc);
    setDidFallback(true);
  };

  return <img {...rest} src={resolvedSrc} alt={alt} onError={handleError} />;
}