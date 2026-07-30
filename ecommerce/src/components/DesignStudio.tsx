"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  FlipHorizontal,
  Loader2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type DesignPlacement = "front" | "back";

export type DesignCustomizationSide = {
  artworkUrl: string;
  previewDataUrl: string;
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  angle: number;
};

export type DesignCustomization = {
  front: DesignCustomizationSide | null;
  back: DesignCustomizationSide | null;
};

type Props = {
  onCustomizationChange: (customization: DesignCustomization | null) => void;
  productImageFront?: string;
  productImageBack?: string;
};

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 560;

// Safe print area (percentage of canvas)
const PRINT_AREA = {
  front: { x: 0.28, y: 0.22, w: 0.44, h: 0.38 },
  back: { x: 0.28, y: 0.20, w: 0.44, h: 0.42 },
};

const MAX_FILE_MB = 20;
const MIN_DIMENSION = 1200;
const RECOMMENDED_DIMENSION = 2000;

type FabricLib = typeof import("fabric");
type FabricCanvas = InstanceType<FabricLib["Canvas"]>;
type FabricImage = InstanceType<FabricLib["FabricImage"]>;

type SideState = {
  dataUrl: string | null;
  artworkUrl: string | null;
  angle: number;
  scaleX: number;
  scaleY: number;
  left: number;
  top: number;
  hasArtwork: boolean;
  customization: DesignCustomizationSide | null;
};

function freshSide(): SideState {
  return {
    dataUrl: null, artworkUrl: null,
    angle: 0, scaleX: 1, scaleY: 1,
    left: CANVAS_WIDTH / 2, top: CANVAS_HEIGHT / 2,
    hasArtwork: false, customization: null,
  };
}

export default function DesignStudio({ onCustomizationChange, productImageFront, productImageBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const activeImageRef = useRef<FabricImage | null>(null);
  const artworkBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-side persistent state (ref so canvas callbacks always read fresh values)
  const sideStateRef = useRef<Record<DesignPlacement, SideState>>({ front: freshSide(), back: freshSide() });
  // Track current placement in a ref to avoid stale closures in Fabric event handlers
  const placementRef = useRef<DesignPlacement>("front");

  const [placement, setPlacement] = useState<DesignPlacement>("front");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fabricReady, setFabricReady] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasArtwork, setHasArtwork] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);

  const syncCanvasViewport = useCallback(() => {
    const baseCanvas = canvasRef.current;
    const wrapper = baseCanvas?.parentElement;
    if (!baseCanvas || !wrapper) return;

    // Fabric injects fixed-size canvases. Force them to follow container width on small screens.
    wrapper.style.width = "100%";
    wrapper.style.maxWidth = "100%";
    wrapper.style.aspectRatio = `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`;
    wrapper.style.height = "auto";

    const layeredCanvases = wrapper.querySelectorAll("canvas");
    layeredCanvases.forEach((node) => {
      const element = node as HTMLCanvasElement;
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.maxWidth = "100%";
      element.style.display = "block";
    });
  }, []);

  // Lazy-load Fabric.js
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    import("fabric").then((module) => {
      if (cancelled || !canvasRef.current) return;

      const fabric = module;
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#f5ede3",
        selection: false,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;
      setFabricReady(true);
      setIsLoading(false);
      syncCanvasViewport();

      // Draw shirt silhouette and print area guide
      drawPrintAreaGuide(canvas, "front");

      canvas.on("object:modified", () => {
        const img = activeImageRef.current;
        if (!img) return;
        constrainToCanvas(canvas, img);
        const cur = sideStateRef.current[placementRef.current];
        if (cur.artworkUrl) exportPreviewWithUrl(canvas, img, cur.artworkUrl, placementRef.current);
      });
    }).catch(() => {
      if (!cancelled) {
        setIsLoading(false);
        setUploadError("Design studio could not be loaded. Please refresh and try again.");
      }
    });

    return () => {
      cancelled = true;
      if (artworkBlobUrlRef.current) {
        URL.revokeObjectURL(artworkBlobUrlRef.current);
        artworkBlobUrlRef.current = null;
      }
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleResize = () => syncCanvasViewport();
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncCanvasViewport]);

  // Sync placement ref and rebuild canvas when placement changes
  useEffect(() => {
    placementRef.current = placement;
    if (!fabricRef.current || !fabricReady) return;
    const canvas = fabricRef.current;

    drawPrintAreaGuide(canvas, placement);
    void drawShirtBackground(canvas, placement);

    const side = sideStateRef.current[placement];
    if (side.hasArtwork && side.dataUrl) {
      setHasArtwork(false);
      setArtworkUrl(null);
      void placeArtworkOnCanvas(side.dataUrl, {
        angle: side.angle, scaleX: side.scaleX, scaleY: side.scaleY,
        left: side.left, top: side.top,
      }).then((success) => {
        if (success) {
          setArtworkUrl(side.artworkUrl);
          sideStateRef.current[placement].artworkUrl = side.artworkUrl;
          const img = activeImageRef.current;
          if (img && side.artworkUrl) exportPreviewWithUrl(canvas, img, side.artworkUrl, placement);
        }
      });
    } else {
      setHasArtwork(false);
      setArtworkUrl(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, fabricReady, productImageFront, productImageBack]);

  function drawPrintAreaGuide(canvas: FabricCanvas, place: DesignPlacement) {
    // Remove existing guide objects (non-artwork)
    const toRemove = canvas.getObjects().filter((obj) => (obj as { _isGuide?: boolean })._isGuide);
    for (const obj of toRemove) canvas.remove(obj);

    const area = PRINT_AREA[place];
    const x = area.x * CANVAS_WIDTH;
    const y = area.y * CANVAS_HEIGHT;
    const w = area.w * CANVAS_WIDTH;
    const h = area.h * CANVAS_HEIGHT;

    // Import fabric to use Rect — since we deferred loading we use the stored ref approach
    import("fabric").then((fabric) => {
      if (!fabricRef.current) return;

      const rect = new fabric.Rect({
        left: x,
        top: y,
        width: w,
        height: h,
        fill: "transparent",
        stroke: "rgba(176,64,80,0.5)",
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        hoverCursor: "default",
      });
      (rect as { _isGuide?: boolean })._isGuide = true;

      const label = new fabric.FabricText(
        place === "front" ? "Safe Print Area (Front)" : "Safe Print Area (Back)",
        {
          left: x,
          top: y - 20,
          fontSize: 11,
          fill: "rgba(176,64,80,0.7)",
          fontFamily: "system-ui",
          selectable: false,
          evented: false,
        }
      );
      (label as { _isGuide?: boolean })._isGuide = true;

      canvas.add(rect);
      canvas.add(label);

      // Make artwork always on top
      if (activeImageRef.current) {
        canvas.bringObjectToFront(activeImageRef.current);
      }
      canvas.renderAll();
    });
  }

  async function drawShirtBackground(canvas: FabricCanvas, place: DesignPlacement) {
    // Remove existing shirt background objects
    const toRemove = canvas.getObjects().filter((obj) => (obj as { _isShirt?: boolean })._isShirt);
    for (const obj of toRemove) canvas.remove(obj);

    const imgUrl = place === "front" ? productImageFront : productImageBack;
    if (!imgUrl) return;

    const fabric = await import("fabric");
    try {
      const shirtImg = await fabric.FabricImage.fromURL(imgUrl, { crossOrigin: "anonymous" });

      // Keep full shirt visible inside canvas (especially on mobile)
      const scale = Math.min(CANVAS_WIDTH / (shirtImg.width ?? 1), CANVAS_HEIGHT / (shirtImg.height ?? 1)) * 0.96;

      shirtImg.set({
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        hoverCursor: "default",
        opacity: 1,
      });
      (shirtImg as { _isShirt?: boolean })._isShirt = true;

      canvas.add(shirtImg);
      canvas.sendObjectToBack(shirtImg);
      canvas.renderAll();
    } catch {
      // No shirt background — canvas plain background is fine
    }
  }

  function constrainToCanvas(canvas: FabricCanvas, img: FabricImage) {
    const obj = img;
    const zoom = canvas.getZoom();
    const w = (obj.getScaledWidth() * zoom) / 2;
    const h = (obj.getScaledHeight() * zoom) / 2;

    let left = obj.left ?? 0;
    let top = obj.top ?? 0;

    left = Math.max(w, Math.min(CANVAS_WIDTH - w, left));
    top = Math.max(h, Math.min(CANVAS_HEIGHT - h, top));

    obj.set({ left, top });
    obj.setCoords();
  }

  function exportPreviewWithUrl(canvas: FabricCanvas, img: FabricImage, currentArtworkUrl: string, currentPlacement: DesignPlacement) {
    const dataUrl = canvas.toDataURL({ format: "jpeg", quality: 0.75, multiplier: 0.75 });
    const side: DesignCustomizationSide = {
      artworkUrl: currentArtworkUrl,
      previewDataUrl: dataUrl,
      positionX: img.left ?? 0,
      positionY: img.top ?? 0,
      scaleX: img.scaleX ?? 1,
      scaleY: img.scaleY ?? 1,
      angle: img.angle ?? 0,
    };
    sideStateRef.current[currentPlacement].customization = side;
    onCustomizationChange({
      front: sideStateRef.current.front.customization,
      back: sideStateRef.current.back.customization,
    });
  }

  const validateAndUpload = useCallback(async (file: File) => {
    setUploadError(null);

    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only PNG, JPG, and JPEG images are allowed.");
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File must be smaller than ${MAX_FILE_MB} MB.`);
      return;
    }

    // Validate resolution client-side before uploading
    const resolvedDimensions = await new Promise<{ w: number; h: number; dataUrl: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) ?? "";
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, dataUrl });
        img.onerror = () => resolve({ w: 0, h: 0, dataUrl: "" });
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    if (resolvedDimensions.w < MIN_DIMENSION || resolvedDimensions.h < MIN_DIMENSION) {
      setUploadError(
        `This image is too small to print clearly. Please upload at least ${MIN_DIMENSION}×${MIN_DIMENSION} px. Your image is ${resolvedDimensions.w}×${resolvedDimensions.h} px.`
      );
      return;
    }

    if (resolvedDimensions.w < RECOMMENDED_DIMENSION || resolvedDimensions.h < RECOMMENDED_DIMENSION) {
      setUploadError(
        `Your image is below our premium quality recommendation (${RECOMMENDED_DIMENSION}×${RECOMMENDED_DIMENSION} px), but you can still continue. Current size: ${resolvedDimensions.w}×${resolvedDimensions.h} px.`
      );
    }

    const didRender = await placeArtworkOnCanvas(resolvedDimensions.dataUrl);
    if (!didRender) {
      setUploadError("This file could not be rendered on canvas. Please try a different image.");
      return;
    }
    // Store the local data URL for tab switching restoration
    sideStateRef.current[placement].dataUrl = resolvedDimensions.dataUrl;
    sideStateRef.current[placement].hasArtwork = true;

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/design/upload", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setUploadError((data.error ?? "Upload failed. Please try again.") + " Design preview is visible, but it may not be saved with your order until upload succeeds.");
        return;
      }

      setArtworkUrl(data.url);
      sideStateRef.current[placement].artworkUrl = data.url;
      const img = activeImageRef.current;
      const canvas = fabricRef.current;
      if (img && canvas) {
        exportPreviewWithUrl(canvas, img, data.url, placement);
      }
    } catch {
      setUploadError("Network error. Design preview is visible, but upload did not complete. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }, [placement]); // eslint-disable-line react-hooks/exhaustive-deps

  async function placeArtworkOnCanvas(
    url: string,
    savedTransform?: { angle: number; scaleX: number; scaleY: number; left: number; top: number }
  ) {
    const canvas = fabricRef.current;
    if (!canvas) return false;

    // Remove existing artwork
    if (activeImageRef.current) {
      canvas.remove(activeImageRef.current);
      activeImageRef.current = null;
    }
    if (artworkBlobUrlRef.current) {
      URL.revokeObjectURL(artworkBlobUrlRef.current);
      artworkBlobUrlRef.current = null;
    }

    const fabric = await import("fabric");

    try {
      const img = await fabric.FabricImage.fromURL(url);
      if (url.startsWith("blob:")) {
        artworkBlobUrlRef.current = url;
      }

      const area = PRINT_AREA[placementRef.current];
      const printW = area.w * CANVAS_WIDTH;
      const printH = area.h * CANVAS_HEIGHT;
      const printCX = (area.x + area.w / 2) * CANVAS_WIDTH;
      const printCY = (area.y + area.h / 2) * CANVAS_HEIGHT;

      const scaleToFit = Math.min(printW / (img.width ?? 1), printH / (img.height ?? 1)) * 0.8;

      if (savedTransform) {
        img.set({
          left: savedTransform.left,
          top: savedTransform.top,
          originX: "center",
          originY: "center",
          scaleX: savedTransform.scaleX,
          scaleY: savedTransform.scaleY,
          angle: savedTransform.angle,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockUniScaling: true,
        });
      } else {
        img.set({
          left: printCX,
          top: printCY,
          originX: "center",
          originY: "center",
          scaleX: scaleToFit,
          scaleY: scaleToFit,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockUniScaling: true,
        });
      }

      canvas.add(img);
      canvas.bringObjectToFront(img);
      canvas.setActiveObject(img);
      activeImageRef.current = img as unknown as FabricImage;

      // Persist transform to sideStateRef
      sideStateRef.current[placementRef.current].angle = img.angle ?? 0;
      sideStateRef.current[placementRef.current].scaleX = img.scaleX ?? 1;
      sideStateRef.current[placementRef.current].scaleY = img.scaleY ?? 1;
      sideStateRef.current[placementRef.current].left = img.left ?? 0;
      sideStateRef.current[placementRef.current].top = img.top ?? 0;
      sideStateRef.current[placementRef.current].hasArtwork = true;

      setHasArtwork(true);
      canvas.renderAll();
      return true;
    } catch {
      return false;
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void validateAndUpload(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void validateAndUpload(file);
  };

  const removeArtwork = () => {
    const canvas = fabricRef.current;
    if (!canvas || !activeImageRef.current) return;
    canvas.remove(activeImageRef.current);
    activeImageRef.current = null;
    if (artworkBlobUrlRef.current) {
      URL.revokeObjectURL(artworkBlobUrlRef.current);
      artworkBlobUrlRef.current = null;
    }
    sideStateRef.current[placement] = freshSide();
    setHasArtwork(false);
    setArtworkUrl(null);
    canvas.renderAll();
    // Emit combined (other side may still have a design)
    const other: DesignPlacement = placement === "front" ? "back" : "front";
    const hasBoth = sideStateRef.current.front.customization || sideStateRef.current.back.customization;
    if (hasBoth) {
      onCustomizationChange({
        front: sideStateRef.current.front.customization,
        back: sideStateRef.current.back.customization,
      });
    } else {
      onCustomizationChange(null);
    }
    void other; // suppress unused warning
  };

  const rotateBy = (degrees: number) => {
    const img = activeImageRef.current;
    if (!img) return;
    img.rotate(((img.angle ?? 0) + degrees + 360) % 360);
    fabricRef.current?.renderAll();
    const cur = sideStateRef.current[placement];
    if (fabricRef.current && cur.artworkUrl) exportPreviewWithUrl(fabricRef.current, img, cur.artworkUrl, placement);
  };

  const scaleBy = (factor: number) => {
    const img = activeImageRef.current;
    if (!img) return;
    const next = Math.max(0.05, Math.min(10, (img.scaleX ?? 1) * factor));
    img.set({ scaleX: next, scaleY: next });
    if (fabricRef.current) {
      constrainToCanvas(fabricRef.current, img);
      fabricRef.current.renderAll();
      const cur = sideStateRef.current[placement];
      if (cur.artworkUrl) exportPreviewWithUrl(fabricRef.current, img, cur.artworkUrl, placement);
    }
  };

  const snapToCenter = () => {
    const img = activeImageRef.current;
    const canvas = fabricRef.current;
    if (!img || !canvas) return;
    const area = PRINT_AREA[placement];
    img.set({
      left: (area.x + area.w / 2) * CANVAS_WIDTH,
      top: (area.y + area.h / 2) * CANVAS_HEIGHT,
    });
    img.setCoords();
    canvas.renderAll();
    const cur = sideStateRef.current[placement];
    if (cur.artworkUrl) exportPreviewWithUrl(canvas, img, cur.artworkUrl, placement);
  };

  const resetTransform = () => {
    const img = activeImageRef.current;
    const canvas = fabricRef.current;
    if (!img || !canvas) return;
    const area = PRINT_AREA[placement];
    const printW = area.w * CANVAS_WIDTH;
    const printH = area.h * CANVAS_HEIGHT;
    const scaleToFit = Math.min(printW / (img.width ?? 1), printH / (img.height ?? 1)) * 0.8;
    img.set({
      scaleX: scaleToFit,
      scaleY: scaleToFit,
      angle: 0,
      left: (area.x + area.w / 2) * CANVAS_WIDTH,
      top: (area.y + area.h / 2) * CANVAS_HEIGHT,
    });
    img.setCoords();
    canvas.renderAll();
    const cur = sideStateRef.current[placement];
    if (cur.artworkUrl) exportPreviewWithUrl(canvas, img, cur.artworkUrl, placement);
  };

  const changePlacement = (next: DesignPlacement) => {
    if (next === placement) return;
    setUploadError(null);

    const canvas = fabricRef.current;
    // Save current side's transform before clearing canvas
    if (activeImageRef.current && canvas) {
      const img = activeImageRef.current;
      sideStateRef.current[placement].angle = img.angle ?? 0;
      sideStateRef.current[placement].scaleX = img.scaleX ?? 1;
      sideStateRef.current[placement].scaleY = img.scaleY ?? 1;
      sideStateRef.current[placement].left = img.left ?? 0;
      sideStateRef.current[placement].top = img.top ?? 0;
      canvas.remove(img);
      activeImageRef.current = null;
    }
    // Remove shirt bg so placement useEffect can redraw for new side
    if (canvas) {
      const toRemove = canvas.getObjects().filter((obj) => (obj as { _isShirt?: boolean })._isShirt);
      for (const obj of toRemove) canvas.remove(obj);
    }

    setHasArtwork(false);
    setArtworkUrl(null);
    setPlacement(next);
  };

  return (
    <div className="space-y-4">
      {/* Placement tabs */}
      <div className="grid grid-cols-2 gap-2">
        {(["front", "back"] as const).map((side) => {
          const sideHasDesign = sideStateRef.current[side].hasArtwork;
          return (
            <button
              key={side}
              type="button"
              onClick={() => changePlacement(side)}
              className={`relative rounded-2xl border px-3 py-2.5 text-sm font-semibold transition md:px-4 md:py-3 ${
                placement === side
                  ? "border-[var(--secondary)] bg-[var(--secondary)] text-white"
                  : "border-[#ddd0c5] bg-white text-[var(--page-fg)] hover:border-[var(--secondary)]"
              }`}
            >
              {side === "front" ? "Front Print" : "Back Print"}
              {sideHasDesign && (
                <span className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${placement === side ? "bg-white text-[var(--secondary)]" : "bg-emerald-500 text-white"}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Canvas area */}
      <div className="relative overflow-hidden rounded-[26px] border border-[#e8ddd5] bg-[#f5ede3] shadow-inner md:rounded-3xl">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f5ede3]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--secondary)]" />
            <p className="text-sm text-[#7a6a62]">Loading design studio…</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block h-full w-full max-w-full"
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload zone / controls */}
      {!hasArtwork ? (
        <div
          className="group relative cursor-pointer rounded-3xl border-2 border-dashed border-[#ddd0c5] bg-white p-8 text-center transition hover:border-[var(--secondary)] hover:bg-[#fffaf7]"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Upload artwork file"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--secondary)]" />
              <p className="text-sm font-medium text-[#7a6a62]">Uploading your artwork…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e5da]">
                <Upload className="h-6 w-6 text-[var(--secondary)]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--page-fg)]">
                  Drop your artwork here or <span className="text-[var(--secondary)]">browse</span>
                </p>
                <p className="mt-1 text-sm text-[#8b7d75]">PNG or JPG • Max 20 MB • Min 1200×1200 px • 2000×2000 px recommended</p>
                <p className="mt-1 text-xs text-[#b0a09a]">Transparent PNG supported for best results</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Upload artwork"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Artwork controls */}
          <div className="rounded-2xl border border-[#e8ddd5] bg-white p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#8e7f75]">Artwork Controls</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => rotateBy(-15)}
                title="Rotate left 15°"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                -15°
              </button>
              <button
                type="button"
                onClick={() => rotateBy(15)}
                title="Rotate right 15°"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <RotateCw className="h-3.5 w-3.5" />
                +15°
              </button>
              <button
                type="button"
                onClick={() => scaleBy(1.15)}
                title="Scale up"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Larger
              </button>
              <button
                type="button"
                onClick={() => scaleBy(0.87)}
                title="Scale down"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                Smaller
              </button>
              <button
                type="button"
                onClick={snapToCenter}
                title="Snap to centre of print area"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                Centre
              </button>
              <button
                type="button"
                onClick={resetTransform}
                title="Reset position and size"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Replace artwork"
                className="flex items-center gap-1.5 rounded-xl border border-[#e2d5c9] px-3 py-2 text-xs font-semibold text-[#5a4a42] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
              >
                <Upload className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={removeArtwork}
                title="Remove artwork"
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 transition hover:border-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
          <p className="text-xs text-[#9e8e85]">
            Drag the artwork to reposition it. Use the controls above to resize or rotate.
            Keep it within the dashed print-area guide for best results.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Replace artwork"
          />
        </div>
      )}
    </div>
  );
}
