import { useState, useRef, useEffect } from "react";
import { getCroppedImg } from "@/lib/crop-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@frontend/components/ui/dialog";
import { Button } from "@frontend/components/ui/button";
import { toast } from "sonner";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  elementType?: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  onUploadOriginal: () => void;
  aspectRatio?: number;
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  onUploadOriginal,
  aspectRatio = 1,
}: ImageCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDim, setImgDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging interaction state
  const dragRef = useRef<{
    mode: "move" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null;
    startX: number;
    startY: number;
    startCrop: { x: number; y: number; size: number };
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, size: 0 },
  });

  // Calculate exact rendered dimensions of photo content inside object-contain container
  const initializeCropBox = () => {
    if (!imgRef.current || !containerRef.current) return;
    const natW = imgRef.current.naturalWidth;
    const natH = imgRef.current.naturalHeight;
    const contW = containerRef.current.clientWidth;
    const contH = containerRef.current.clientHeight;

    if (natW <= 0 || natH <= 0 || contW <= 0 || contH <= 0) return;

    const contAspect = contW / contH;
    const imgAspect = natW / natH;

    let dispW = 0;
    let dispH = 0;

    if (imgAspect > contAspect) {
      dispW = contW;
      dispH = contW / imgAspect;
    } else {
      dispH = contH;
      dispW = contH * imgAspect;
    }

    setImgDim({ width: dispW, height: dispH });

    const maxW = Math.min(dispW, dispH * aspectRatio);
    const maxH = maxW / aspectRatio;
    const initX = (dispW - maxW) / 2;
    const initY = (dispH - maxH) / 2;

    setCropBox({
      x: initX,
      y: initY,
      size: maxW,
    });
    setImgLoaded(true);
  };

  useEffect(() => {
    if (isOpen) {
      setImgLoaded(false);
    }
  }, [isOpen, imageSrc]);

  // Recalculate if window resizes while open
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && imgLoaded) {
        initializeCropBox();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, imgLoaded]);

  // Pointer Event Handlers for Dragging Box & Corners
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: "move" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { mode, startX, startY, startCrop } = dragRef.current;
    if (!mode || imgDim.width <= 0 || imgDim.height <= 0) return;

    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const w = imgDim.width;
    const h = imgDim.height;
    const minSize = 30;

    let { x, y, size } = startCrop;

    if (mode === "move") {
      const boxHeight = size / aspectRatio;
      x = Math.max(0, Math.min(w - size, startCrop.x + dx));
      y = Math.max(0, Math.min(h - boxHeight, startCrop.y + dy));
    } else if (mode === "bottom-right") {
      const delta = (dx + dy * aspectRatio) / 2;
      const maxSize = Math.min(w - startCrop.x, (h - startCrop.y) * aspectRatio);
      size = Math.max(minSize, Math.min(maxSize, startCrop.size + delta));
    } else if (mode === "bottom-left") {
      const delta = (-dx + dy * aspectRatio) / 2;
      const maxSize = Math.min(startCrop.x + startCrop.size, (h - startCrop.y) * aspectRatio);
      size = Math.max(minSize, Math.min(maxSize, startCrop.size + delta));
      x = startCrop.x + (startCrop.size - size);
    } else if (mode === "top-right") {
      const delta = (dx - dy * aspectRatio) / 2;
      const maxSize = Math.min(w - startCrop.x, startCrop.y * aspectRatio + startCrop.size);
      size = Math.max(minSize, Math.min(maxSize, startCrop.size + delta));
      y = startCrop.y + (startCrop.size - size) / aspectRatio;
    } else if (mode === "top-left") {
      const delta = (-dx - dy * aspectRatio) / 2;
      const maxSize = Math.min(startCrop.x + startCrop.size, startCrop.y * aspectRatio + startCrop.size);
      size = Math.max(minSize, Math.min(maxSize, startCrop.size + delta));
      x = startCrop.x + (startCrop.size - size);
      y = startCrop.y + (startCrop.size - size) / aspectRatio;
    }

    setCropBox({ x, y, size });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.mode) {
      dragRef.current.mode = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // pointer release fallback
      }
    }
  };

  const handleCrop = async () => {
    if (!imageSrc || !imgRef.current || cropBox.size <= 0) return;
    setIsProcessing(true);
    try {
      const natW = imgRef.current.naturalWidth;
      const natH = imgRef.current.naturalHeight;
      const dispW = imgDim.width;
      const dispH = imgDim.height;

      const scaleX = natW / dispW;
      const scaleY = natH / dispH;

      const pixelCrop = {
        x: cropBox.x * scaleX,
        y: cropBox.y * scaleY,
        width: cropBox.size * scaleX,
        height: (cropBox.size / aspectRatio) * scaleY,
      };

      const croppedBlob = await getCroppedImg(imageSrc, pixelCrop);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCropComplete(croppedFile);
      } else {
        toast.error("Gagal memotong gambar.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat memotong gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] bg-cream border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] text-ink p-6 max-h-[92vh] overflow-y-auto z-[9999]">
        <DialogHeader className="border-b border-ink/10 pb-3">
          <DialogTitle className="display text-lg uppercase font-black">
            Potong Foto {aspectRatio === 1 ? "1:1 Square" : "5:6 (Hero Banner)"} ✂️
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground font-medium">
            Geser kotak foto untuk mengatur posisi, dan **tarik 4 pegangan sudut bundar** untuk memperbesar/memperkecil kotak crop {aspectRatio === 1 ? "1:1" : "5:6"} (terkunci otomatis tepat di batas tepi fisik foto).
          </p>
        </DialogHeader>

        {/* Cropper Work Area Container */}
        <div
          ref={containerRef}
          className="relative w-full h-[380px] bg-neutral-950 rounded-xl border-2 border-ink overflow-hidden flex items-center justify-center select-none mt-3"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Preload hidden image for natural dimension detection */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop target hidden"
            onLoad={initializeCropBox}
            className="hidden"
          />

          {/* Exact-Fit Photo & Bounded Overlay Wrapper */}
          {imgLoaded && imgDim.width > 0 && imgDim.height > 0 && (
            <div
              className="relative pointer-events-auto shadow-2xl"
              style={{
                width: `${imgDim.width}px`,
                height: `${imgDim.height}px`,
              }}
            >
              {/* Display Photo */}
              <img
                src={imageSrc}
                alt="Crop target"
                className="w-full h-full block object-fill pointer-events-none"
              />

              {/* Bounded Crop Box Overlay */}
              {cropBox.size > 0 && (
                <div
                  className="absolute cursor-grab active:cursor-grabbing border-2 border-brand-orange ring-1 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                  style={{
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.size}px`,
                    height: `${cropBox.size / aspectRatio}px`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                >
                  {/* 3x3 Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-white/40" />
                    <div className="border-r border-white/40" />
                    <div />
                  </div>

                  {/* 4 Corner Drag Handles (Tarik Sudut untuk Resize 1:1) */}
                  {/* Top-Left */}
                  <div
                    className="absolute -top-3 -left-3 w-6 h-6 bg-brand-orange border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, "top-left")}
                  />
                  {/* Top-Right */}
                  <div
                    className="absolute -top-3 -right-3 w-6 h-6 bg-brand-orange border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, "top-right")}
                  />
                  {/* Bottom-Left */}
                  <div
                    className="absolute -bottom-3 -left-3 w-6 h-6 bg-brand-orange border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, "bottom-left")}
                  />
                  {/* Bottom-Right */}
                  <div
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-brand-orange border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, "bottom-right")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter className="pt-4 border-t border-ink/10 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onUploadOriginal}
            disabled={isProcessing}
            className="w-full sm:w-auto border-2 border-ink text-xs font-bold uppercase px-4 cursor-pointer hover:bg-neutral-100/60"
          >
            Unggah Asli (Tanpa Potong)
          </Button>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="border-2 border-ink text-xs font-bold uppercase px-4 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleCrop}
              disabled={isProcessing || !imgLoaded}
              className="bg-brand-orange hover:bg-brand-orange/90 text-ink border-2 border-ink text-xs font-bold uppercase px-5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              {isProcessing ? "Memotong..." : "Potong & Unggah"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
