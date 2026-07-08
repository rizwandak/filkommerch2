import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/crop-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@frontend/components/ui/dialog";
import { Slider } from "@frontend/components/ui/slider";
import { Button } from "@frontend/components/ui/button";
import { toast } from "sonner";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  elementType: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  onUploadOriginal: () => void;
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  elementType,
  onClose,
  onCropComplete,
  onUploadOriginal,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(5 / 6);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Set default aspect ratio based on element type
  useEffect(() => {
    if (elementType === "image_banner") {
      setAspect(16 / 9);
    } else if (elementType === "limited_drop") {
      setAspect(4 / 5);
    } else {
      setAspect(5 / 6); // default for hero banner
    }
  }, [elementType, isOpen]);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
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
      <DialogContent className="sm:max-w-[550px] bg-cream border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] text-ink p-6 max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="border-b border-ink/10 pb-3">
          <DialogTitle className="display text-lg uppercase font-black">Sesuaikan & Potong Foto ✂️</DialogTitle>
        </DialogHeader>

        {/* Aspect Ratio Selectors based on element type */}
        <div className="space-y-1.5 py-3 border-b border-ink/10">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pilih Rasio Aspek:</label>
          <div className="flex flex-wrap gap-2 justify-start">
            {elementType === "hero_banner" && (
              <>
                <button
                  type="button"
                  onClick={() => setAspect(5 / 6)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 5 / 6 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Lookbook Desktop (5:6)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(1 / 1)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 1 / 1 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Square Mobile (1:1)
                </button>
              </>
            )}

            {elementType === "image_banner" && (
              <>
                <button
                  type="button"
                  onClick={() => setAspect(16 / 9)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 16 / 9 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Landscape (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(21 / 9)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 21 / 9 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Ultra Wide (21:9)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(1 / 1)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 1 / 1 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Square (1:1)
                </button>
              </>
            )}

            {elementType === "limited_drop" && (
              <>
                <button
                  type="button"
                  onClick={() => setAspect(4 / 5)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 4 / 5 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Drop Portrait (4:5)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(1 / 1)}
                  className={`px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    aspect === 1 / 1 ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-cream/40 text-ink hover:bg-cream/60"
                  }`}
                >
                  Square (1:1)
                </button>
              </>
            )}

            {elementType !== "hero_banner" && elementType !== "image_banner" && elementType !== "limited_drop" && (
              <button
                type="button"
                onClick={() => setAspect(1 / 1)}
                className="px-3 py-1.5 border-2 border-ink text-[10px] font-bold uppercase bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
              >
                Square (1:1)
              </button>
            )}
          </div>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-[280px] bg-neutral-900 border-2 border-ink rounded overflow-hidden mt-4">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
          />
        </div>

        {/* Zoom Control Slider */}
        <div className="space-y-2 mt-4">
          <label className="text-[10px] font-black uppercase flex justify-between tracking-wide">
            <span>Perbesar / Zoom</span>
            <span className="font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
          </label>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold">1x</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(val) => setZoom(val[0])}
              className="flex-1 cursor-pointer"
            />
            <span className="text-[10px] font-bold">3x</span>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="pt-4 border-t border-ink/10 mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
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
              disabled={isProcessing}
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
