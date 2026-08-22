import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";

interface LiveCameraCaptureProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  resolveImageUrl: (url: string) => string;
  disabled?: boolean;
  isRequired?: boolean;
  label?: string;
}

export function LiveCameraCapture({
  value,
  onChange,
  onRemove,
  resolveImageUrl,
  disabled = false,
  isRequired = false,
  label = "Foto Bukti Serah Terima / Pengambilan",
}: LiveCameraCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    stopCameraStream();
    setCameraError(null);

    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      const err = "Kamera tidak didukung pada browser ini. Silakan gunakan opsi upload file.";
      setCameraError(err);
      toast.error(err);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback without exact constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Short delay to ensure video element is mounted and rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let message = "Gagal mengakses kamera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        message = "Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "Kamera tidak ditemukan pada perangkat ini.";
      }
      setCameraError(message);
      toast.error(message);
      setIsCameraActive(false);
    }
  };

  const toggleFacingMode = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    void startCamera(nextFacing);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Gagal memproses gambar kamera.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    setUploading(true);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setUploading(false);
          toast.error("Gagal mengambil frame foto.");
          return;
        }

        const file = new File([blob], `proof_${Date.now()}.jpg`, { type: "image/jpeg" });
        try {
          const formData = new FormData();
          formData.append("file", file);
          const API_BASE_URL = getApiBaseUrl();
          const res = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.url || data.path) {
            onChange(data.url || data.path);
            stopCameraStream();
            toast.success("Foto berhasil dijepret & diunggah!");
          } else {
            toast.error(data.error || "Gagal mengunggah foto.");
          }
        } catch {
          toast.error("Terjadi kesalahan saat mengunggah foto.");
        } finally {
          setUploading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCameraStream();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url || data.path) {
        onChange(data.url || data.path);
        toast.success("Foto bukti berhasil diunggah!");
      } else {
        toast.error(data.error || "Gagal mengunggah file.");
      }
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <label className="font-extrabold text-ink uppercase tracking-wide flex items-center gap-1.5 text-xs">
          📸 {label}
        </label>
        {isRequired && (
          <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase">
            * Wajib
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFileUpload(e)}
      />

      {/* Live Camera View */}
      {isCameraActive ? (
        <div className="relative border-2 border-ink rounded-xl overflow-hidden bg-black shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] flex flex-col items-center">
          <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Top camera controls */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={toggleFacingMode}
                className="h-7 px-2 text-[10px] font-bold bg-black/60 hover:bg-black/80 text-white backdrop-blur border border-white/20 flex items-center gap-1"
                title="Ganti Kamera Depan/Belakang"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ganti Kamera</span>
              </Button>

              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={stopCameraStream}
                className="h-7 w-7 rounded-md bg-red-600/80 hover:bg-red-700 text-white"
                title="Tutup Kamera"
              >
                <CameraOff className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Target Crosshair / Frame Overlay */}
            <div className="absolute inset-4 border border-white/30 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur font-medium">
                Posisikan bukti serah terima / barang di dalam kotak
              </div>
            </div>
          </div>

          {/* Capture Action Bar */}
          <div className="w-full p-3 bg-neutral-900 flex items-center justify-between gap-2 border-t border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopCameraStream}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-[11px] font-bold h-9"
            >
              Batal
            </Button>

            <Button
              type="button"
              disabled={uploading}
              onClick={() => void capturePhoto()}
              className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs h-9 px-5 flex items-center gap-1.5 shadow-md cursor-pointer flex-1"
            >
              <Camera className="w-4 h-4 text-neutral-950" />
              <span>{uploading ? "Menyimpan Foto..." : "📸 Jepret Foto Sekarang"}</span>
            </Button>
          </div>
        </div>
      ) : value ? (
        /* Image Preview View */
        <div className="border-2 border-emerald-500 bg-emerald-50/40 rounded-xl p-3.5 flex flex-col items-center gap-2.5 shadow-xs">
          <div className="relative w-full max-w-[260px] aspect-4/3 rounded-lg border-2 border-ink overflow-hidden bg-white shadow-sm">
            <img
              src={resolveImageUrl(value)}
              alt="Bukti Serah Terima"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Foto Bukti Terunggah
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => void startCamera()}
              className="h-7 text-[10px] font-bold border-ink bg-white hover:bg-cream flex items-center gap-1"
            >
              <Camera className="w-3 h-3 text-brand-orange" />
              <span>Ambil Ulang (Kamera)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[10px] font-bold border-ink bg-white hover:bg-cream flex items-center gap-1"
            >
              <Upload className="w-3 h-3 text-brand-blue" />
              <span>Ganti File</span>
            </Button>

            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={onRemove}
                className="h-7 px-2 text-[10px] font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Selection Mode */
        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-3 ${
          isRequired ? "border-ink/50 bg-cream/30" : "border-ink/40 bg-cream/20"
        }`}>
          {cameraError && (
            <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[10px] flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="font-black text-ink uppercase tracking-wider text-xs block">
              Pilih Metode Pengambilan Bukti
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Bisa langsung jepret dengan kamera live atau upload file galeri
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-sm">
            <Button
              type="button"
              onClick={() => void startCamera()}
              disabled={disabled || uploading}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold text-xs h-9 px-4 flex items-center gap-1.5 flex-1 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] border-2 border-ink cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Buka Kamera Langsung</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="bg-white hover:bg-cream text-ink font-bold text-xs h-9 px-4 flex items-center gap-1.5 flex-1 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] border-2 border-ink cursor-pointer"
            >
              <Upload className="w-4 h-4 text-ink" />
              <span>{uploading ? "Mengunggah..." : "Upload File"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
