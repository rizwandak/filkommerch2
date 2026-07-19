import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Sliders,
  Tag,
  Clock,
  ShieldCheck,
  HelpCircle,
  Image as ImageIcon,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import { getStoreSettings, updateStoreSettings, getProducts, type StoreSettings } from "@backend/server-actions";
import {
  type HomepageSegment,
  type SegmentType,
  convertLegacyToSegments,
  getDefaultSegments,
} from "@/lib/homepage-types";
import { ImageCropperModal } from "@frontend/components/admin/ImageCropperModal";
import { resolveImageUrl } from "@/lib/image-resolver";
import hero from "@/assets/hero.jpg";
import pVarsity from "@/assets/p-varsity.jpg";
import pHoodie from "@/assets/p-hoodie.jpg";
import varsityEdutech from "@/assets/varsityedutech.png";
import workJacket from "@/assets/workjacket.png";


// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepageEditorPage,
  head: () => ({ meta: [{ title: "Tata Letak — Admin Panel" }] }),
});

const getElementTemplate = (type: SegmentType): any => {
  switch (type) {
    case "hero_banner":
      return {
        title: "",
        subtitle: "",
        subLabel: "",
        btnText: "",
        btnLink: "",
        image: "",
        showCountdown: false,
        countdownEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
        showVerifyBtn: false,
      };
    case "marquee":
      return { text: "" };
    case "countdown":
      return {
        title: "",
        subtitle: "",
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
        style: "full",
      };
    case "product_grid":
      return {
        title: "",
        subtitle: "",
        source: "all",
        slugs: "",
        maxItems: 3,
      };
    case "category_showcase":
      return { title: "" };
    case "image_banner":
      return {
        image: "",
        alt: "",
        link: "/#shop",
        height: "md",
      };
    case "text_block":
      return {
        title: "",
        subtitle: "",
        body: "",
        alignment: "center",
      };
    case "value_props":
      return {
        items: [],
      };
    case "faq":
      return {
        items: [],
      };
    case "limited_drop":
      return {
        title: "",
        subtitle: "",
        productSlug: "",
        image: "",
        countdownEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
        stockMax: 100,
        stockCurrent: 0,
      };
    case "bundle_recommendation":
      return {
        title: "",
        subtitle: "",
        items: [],
      };
    case "gallery":
      return {
        title: "",
        subtitle: "",
        items: [],
      };
    case "testimonial":
      return {
        title: "",
        subtitle: "",
        items: [],
      };
  }
};

const getIcon = (type: SegmentType) => {
  switch (type) {
    case "hero_banner": return "🌟";
    case "marquee": return "📢";
    case "countdown": return "⏱️";
    case "product_grid": return "🛍️";
    case "category_showcase": return "🏷️";
    case "image_banner": return "🖼️";
    case "text_block": return "📝";
    case "value_props": return "🛡️";
    case "faq": return "❓";
    case "limited_drop": return "🔥";
    case "bundle_recommendation": return "🎁";
    case "gallery": return "📸";
    case "testimonial": return "💬";
  }
};

const getTypeName = (type: SegmentType) => {
  switch (type) {
    case "hero_banner": return "Hero Banner";
    case "marquee": return "Marquee Text";
    case "countdown": return "Countdown";
    case "product_grid": return "Product Grid";
    case "category_showcase": return "Categories";
    case "image_banner": return "Image Banner";
    case "text_block": return "Text Block";
    case "value_props": return "Value Props";
    case "faq": return "FAQ Section";
    case "limited_drop": return "Limited Drop";
  }
};

// Sortable Segment Item (sidebar list)
interface SortableSegmentItemProps {
  segment: HomepageSegment;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  isCashier?: boolean;
}

function SortableSegmentItem({
  segment,
  isSelected,
  onSelect,
  onToggleEnabled,
  onDelete,
  isCashier,
}: SortableSegmentItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: segment.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2.5 border-2 border-ink rounded-md transition-all duration-150 ${
        isSelected
          ? "bg-ink text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
          : "bg-cream/40 text-ink hover:bg-cream/60"
      }`}
    >
      {!isCashier && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-cream hover:bg-black/5 rounded"
          title="Geser Urutan"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <div
        className="flex-1 flex flex-col cursor-pointer min-w-0 py-0.5"
        onClick={onSelect}
      >
        <span className="text-[10px] font-black uppercase tracking-wider truncate leading-tight">
          {segment.title || "Segmen Baru"}
        </span>
        <span className={`text-[8px] truncate mt-0.5 opacity-80 ${isSelected ? "text-cream/70" : "text-muted-foreground"}`}>
          {segment.elements?.length || 0} elemen
        </span>
      </div>

      {!isCashier && (
        <div className="flex items-center gap-1 shrink-0 relative z-10" style={{ pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleEnabled();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1 rounded border transition-colors cursor-pointer ${
              segment.enabled
                ? isSelected ? "border-cream/20 text-cream hover:bg-white/10" : "border-ink/20 text-ink hover:bg-black/5"
                : "border-dashed border-red-500/40 text-red-500 hover:bg-red-50"
            }`}
            title={segment.enabled ? "Sembunyikan dari Beranda" : "Tampilkan di Beranda"}
          >
            {segment.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1 rounded border transition-colors cursor-pointer ${
              isSelected
                ? "border-cream/20 text-red-400 hover:bg-white/10"
                : "border-ink/20 text-red-500 hover:bg-red-50"
            }`}
            title="Hapus Segmen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AdminHomepageEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const isCashier = (user as any)?.role === "cashier";
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [segments, setSegments] = useState<HomepageSegment[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddElementMenu, setShowAddElementMenu] = useState(false);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cropperContext, setCropperContext] = useState<{
    segmentId: string;
    elementId: string;
    key: string;
    elementType: string;
  } | null>(null);

  const getApiBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || "https://filkommerch.com";
    return url.replace(/\/api\/?$/, "").replace(/\/$/, "");
  };
  const API_BASE_URL = getApiBaseUrl();

  // Sensors for DnD kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeSegment = useMemo(() => {
    return segments.find((s) => s.id === selectedSegmentId) || null;
  }, [segments, selectedSegmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsResult, productsResult] = await Promise.all([
        getStoreSettings(),
        getProducts(),
      ]);

      if (settingsResult.settings) {
        setSettings(settingsResult.settings);
        const layoutRaw = settingsResult.settings.homepage_layout;
        let parsed = [];
        if (layoutRaw) {
          try {
            const rawObj = JSON.parse(layoutRaw);
            parsed = convertLegacyToSegments(rawObj);
          } catch {
            parsed = getDefaultSegments();
          }
        } else {
          parsed = getDefaultSegments();
        }
        setSegments(parsed);
        if (parsed.length > 0) {
          setSelectedSegmentId(parsed[0].id);
        }
      }

      if (productsResult.products) {
        setDbProducts(productsResult.products);
      }
    } catch {
      toast.error("Gagal memuat pengaturan tata letak");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading]);

  const handleSave = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menyimpan tata letak.");
      return;
    }
    if (!settings) return;
    setSaving(true);

    try {
      const layoutJson = JSON.stringify(segments);
      const result = await updateStoreSettings({
        data: {
          store_name: settings.store_name,
          address: settings.address || undefined,
          phone: settings.phone || undefined,
          tax_rate: settings.tax_rate,
          qris_static_url: settings.qris_static_url || undefined,
          homepage_layout: layoutJson,
          userRole: "admin",
        },
      });

      if (result.success) {
        toast.success("Tata letak beranda modular berhasil disimpan!");
        await loadData();
      } else {
        toast.error(result.error || "Gagal menyimpan perubahan");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mereset tata letak.");
      return;
    }
    if (window.confirm("Kembalikan tata letak ke setelan bawaan modular? Semua kustomisasi segmen saat ini akan hilang.")) {
      const defaultSegs = getDefaultSegments();
      setSegments(defaultSegs);
      if (defaultSegs.length > 0) {
        setSelectedSegmentId(defaultSegs[0].id);
        setExpandedElementId(null);
      }
    }
  };

  const handleAddSegment = () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menambah segmen.");
      return;
    }
    const newId = `seg-${Date.now()}`;
    const newSeg: HomepageSegment = {
      id: newId,
      title: "Segmen Baru",
      enabled: true,
      elements: [],
    };
    setSegments((prev) => [...prev, newSeg]);
    setSelectedSegmentId(newId);
    setExpandedElementId(null);
    toast.success("Segmen baru ditambahkan! Silakan tambah elemen di kolom tengah.");
  };

  const handleDeleteSegment = (id: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus segmen.");
      return;
    }
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null);
      setExpandedElementId(null);
    }
    toast.info("Segmen dihapus");
  };

  const handleToggleEnabled = (id: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah status segmen.");
      return;
    }
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, enabled: !s.enabled };
        }
        return s;
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isCashier) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSegments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddElement = (segmentId: string, type: SegmentType) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menambah elemen.");
      return;
    }
    const newElId = `el-${type}-${Date.now()}`;
    const newEl = {
      id: newElId,
      type,
      config: getElementTemplate(type),
    };

    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            elements: [...(seg.elements || []), newEl],
          };
        }
        return seg;
      })
    );

    setExpandedElementId(newElId);
    setShowAddElementMenu(false);
    toast.success(`Elemen "${getTypeName(type)}" ditambahkan!`);
  };

  const handleDeleteElement = (segmentId: string, elementId: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus elemen.");
      return;
    }
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            elements: seg.elements.filter((el) => el.id !== elementId),
          };
        }
        return seg;
      })
    );
    if (expandedElementId === elementId) {
      setExpandedElementId(null);
    }
    toast.info("Elemen dihapus");
  };

  const handleMoveElement = (segmentId: string, elementIndex: number, direction: "up" | "down") => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id === segmentId) {
          const elements = [...seg.elements];
          const newIndex = direction === "up" ? elementIndex - 1 : elementIndex + 1;
          if (newIndex >= 0 && newIndex < elements.length) {
            const temp = elements[elementIndex];
            elements[elementIndex] = elements[newIndex];
            elements[newIndex] = temp;
          }
          return { ...seg, elements };
        }
        return seg;
      })
    );
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, segmentId: string, elementId: string, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah gambar...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setSegments((prev) =>
          prev.map((seg) => {
            if (seg.id === segmentId) {
              return {
                ...seg,
                elements: seg.elements.map((el) => {
                  if (el.id === elementId) {
                    return {
                      ...el,
                      config: {
                        ...el.config,
                        [key]: data.url,
                      },
                    };
                  }
                  return el;
                }),
              };
            }
            return seg;
          })
        );
        toast.success("Gambar berhasil diunggah!");
      } else {
        toast.error(data.error || "Gagal mengunggah gambar");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah gambar");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    segmentId: string,
    elementId: string,
    key: string,
    elementType: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropperImageSrc(objectUrl);
    setOriginalFile(file);
    setCropperContext({ segmentId, elementId, key, elementType });
    setCropperOpen(true);

    e.target.value = "";
  };

  const executeUpload = async (fileToUpload: File) => {
    if (!cropperContext) return;
    const { segmentId, elementId, key } = cropperContext;

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      toast.loading("Mengunggah gambar...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        if (key === "images_append") {
          setSegments((prev) =>
            prev.map((seg) => {
              if (seg.id === segmentId) {
                return {
                  ...seg,
                  elements: seg.elements.map((el) => {
                    if (el.id === elementId) {
                      const existingImages = el.config.images || (el.config.image ? [el.config.image] : []);
                      const updatedImages = [...existingImages, data.url];
                      return {
                        ...el,
                        config: {
                          ...el.config,
                          images: updatedImages,
                          image: el.config.image || data.url,
                        },
                      };
                    }
                    return el;
                  }),
                };
              }
              return seg;
            })
          );
        } else {
          setSegments((prev) =>
            prev.map((seg) => {
              if (seg.id === segmentId) {
                return {
                  ...seg,
                  elements: seg.elements.map((el) => {
                    if (el.id === elementId) {
                      return {
                        ...el,
                        config: {
                          ...el.config,
                          [key]: data.url,
                        },
                      };
                    }
                    return el;
                  }),
                };
              }
              return seg;
            })
          );
        }
        toast.success("Gambar berhasil diunggah!");
      } else {
        toast.error(data.error || "Gagal mengunggah gambar");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah gambar");
    } finally {
      if (cropperImageSrc) {
        URL.revokeObjectURL(cropperImageSrc);
      }
      setCropperImageSrc("");
      setOriginalFile(null);
      setCropperContext(null);
      setCropperOpen(false);
    }
  };

  const updateElementConfig = (segmentId: string, elementId: string, configUpdates: any) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            elements: seg.elements.map((el) => {
              if (el.id === elementId) {
                return {
                  ...el,
                  config: {
                    ...el.config,
                    ...configUpdates,
                  },
                };
              }
              return el;
            }),
          };
        }
        return seg;
      })
    );
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-muted-foreground bg-background min-h-screen flex items-center justify-center font-mono">
        Memuat editor tata letak modular...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-ink pb-6">
        <div>
          <h1 className="display text-3xl sm:text-4xl text-ink tracking-wider uppercase font-black">
            Homepage Page Builder 🛠️
          </h1>
          <p className="text-xs text-muted-foreground font-bold tracking-wider mt-1.5">
            Sistem tata letak modular berbasis segmen. Tambah, hapus, drag-and-drop urutan, dan edit konten real-time.
          </p>
        </div>
        {!isCashier ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
              className="border-2 border-ink hover:bg-neutral-100 text-xs font-bold uppercase tracking-wider py-5 px-5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              Reset Setelan
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest py-5 px-6 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              {saving ? "Menyimpan..." : "Simpan Beranda"}
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ⚠ READ-ONLY MODE
          </span>
        )}
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: Segments list (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            <CardHeader className="p-4 border-b-2 border-ink bg-cream/30">
              <CardTitle className="display text-xs tracking-wider uppercase text-ink">
                Daftar Segmen
              </CardTitle>
              <CardDescription className="text-[10px]">
                Geser handle ⠿ untuk reorder
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={segments.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {segments.map((seg) => (
                      <SortableSegmentItem
                        key={seg.id}
                        segment={seg}
                        isSelected={selectedSegmentId === seg.id}
                        isCashier={isCashier}
                        onSelect={() => {
                          setSelectedSegmentId(seg.id);
                          setExpandedElementId(null);
                        }}
                        onToggleEnabled={() => handleToggleEnabled(seg.id)}
                        onDelete={() => handleDeleteSegment(seg.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {segments.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                  Belum ada segmen.
                </div>
              )}

              {/* Add Segment */}
              {!isCashier && (
                <div className="pt-2 border-t border-ink/10">
                  <Button
                    onClick={handleAddSegment}
                    className="w-full bg-brand-orange hover:bg-brand-orange/95 text-ink font-bold text-xs uppercase tracking-wider py-4 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Tambah Segmen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Pane: Editor Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] min-h-[500px]">
            <CardHeader className="p-5 border-b-2 border-ink bg-cream/30">
              <CardTitle className="display text-sm tracking-wider uppercase text-ink flex items-center justify-between">
                <span>Sunting Segmen</span>
                {activeSegment && (
                  <span className="text-[10px] text-muted-foreground font-mono normal-case">
                    ID: {activeSegment.id}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {!activeSegment ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs font-mono text-center">
                  <p>Silakan pilih segmen di sebelah kiri</p>
                  <p className="mt-1 opacity-70">Atau klik "+ Tambah Segmen" untuk membuat baru</p>
                </div>
              ) : (
                <fieldset disabled={isCashier} className="space-y-6 animate-fade-in w-full border-0 p-0 m-0">
                  {/* Segment Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b-2 border-ink/10">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase">Nama / Judul Segmen</Label>
                      <Input
                        value={activeSegment.title}
                        onChange={(e) => {
                          setSegments((prev) =>
                            prev.map((s) => (s.id === activeSegment.id ? { ...s, title: e.target.value } : s))
                          );
                        }}
                        placeholder="e.g. Header & Banner"
                        className="font-bold text-xs"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={activeSegment.enabled}
                          onChange={(e) => {
                            setSegments((prev) =>
                              prev.map((s) => (s.id === activeSegment.id ? { ...s, enabled: e.target.checked } : s))
                            );
                          }}
                          className="w-4 h-4 rounded border-ink text-brand-orange focus:ring-brand-orange cursor-pointer"
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink">
                          Tampilkan Segmen Ini
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Elements controller inside this segment */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-xs uppercase tracking-wider text-brand-orange">
                        Elemen di Segmen Ini ({activeSegment.elements?.length || 0})
                      </Label>

                      <div className="relative">
                        <Button
                          type="button"
                          onClick={() => setShowAddElementMenu(!showAddElementMenu)}
                          className="h-8 text-[10px] bg-brand-blue hover:bg-brand-blue/90 text-cream uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Elemen
                        </Button>
                        {showAddElementMenu && (
                          <div className="absolute right-0 top-full mt-1 bg-cream border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] rounded-md z-30 p-1.5 grid grid-cols-2 gap-1 animate-slide-up w-[240px]">
                            {[
                              { type: "hero_banner", name: "🌟 Hero Banner" },
                              { type: "marquee", name: "📢 Marquee Text" },
                              { type: "countdown", name: "⏱️ Countdown PO" },
                              { type: "product_grid", name: "🛍️ Product Grid" },
                              { type: "category_showcase", name: "🏷️ Categories" },
                              { type: "image_banner", name: "🖼️ Image Banner" },
                              { type: "text_block", name: "📝 Text Block" },
                              { type: "value_props", name: "🛡️ Value Props" },
                              { type: "faq", name: "❓ FAQ Section" },
                              { type: "limited_drop", name: "🔥 Limited Drop" },
                              { type: "bundle_recommendation", name: "🎁 Bundle Promo" },
                              { type: "gallery", name: "📸 Lifestyle Gallery" },
                              { type: "testimonial", name: "💬 Testimonials" },
                            ].map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => handleAddElement(activeSegment.id, item.type as SegmentType)}
                                className="text-[9px] font-bold text-left p-1.5 rounded hover:bg-ink hover:text-cream border border-ink/10 transition-colors uppercase cursor-pointer"
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rendered Elements list */}
                    <div className="space-y-4">
                      {activeSegment.elements?.map((el, elIdx) => {
                        const isExpanded = expandedElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            className="border-2 border-ink rounded bg-cream/15 p-3.5 space-y-3 relative shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          >
                            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
                              <button
                                type="button"
                                onClick={() => setExpandedElementId(isExpanded ? null : el.id)}
                                className="flex-1 flex items-center gap-1.5 font-extrabold text-xs uppercase text-ink hover:text-brand-orange cursor-pointer text-left min-w-0"
                              >
                                <span>{getIcon(el.type)}</span>
                                <span className="truncate">{getTypeName(el.type)}</span>
                                <span className="text-[9px] text-muted-foreground lowercase normal-case font-normal truncate opacity-80 max-w-[120px]">
                                  ({el.config.title || el.config.text?.slice(0, 15) || "Belum diatur"})
                                </span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0" style={{ pointerEvents: 'auto' }}>
                                <button
                                  type="button"
                                  disabled={elIdx === 0}
                                  onClick={() => handleMoveElement(activeSegment.id, elIdx, "up")}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent rounded cursor-pointer"
                                  title="Pindahkan Ke Atas"
                                >
                                  <ChevronUp className="w-3.5 h-3.5 text-ink" />
                                </button>
                                <button
                                  type="button"
                                  disabled={elIdx === (activeSegment.elements.length - 1)}
                                  onClick={() => handleMoveElement(activeSegment.id, elIdx, "down")}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent rounded cursor-pointer"
                                  title="Pindahkan Ke Bawah"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 text-ink" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteElement(activeSegment.id, el.id);
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                                  title="Hapus Elemen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Elements form fields */}
                            {isExpanded && (
                              <div className="space-y-4 pt-1 animate-slide-down">
                                {/* HERO BANNER CONFIG */}
                                {el.type === "hero_banner" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Sub-Label Atas Hero</Label>
                                      <Input
                                        value={el.config.subLabel || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subLabel: e.target.value })}
                                        placeholder="FILKOM MERCH 2026"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Judul Utama (Gunakan \n untuk baris baru)</Label>
                                      <Textarea
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Wear\nYour\nFaculty."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Deskripsi / Sub-judul</Label>
                                      <Textarea
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="Deskripsi koleksi merchandise..."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Teks Tombol</Label>
                                        <Input
                                          value={el.config.btnText || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { btnText: e.target.value })}
                                          placeholder="SHOP NOW"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Tautan Tombol</Label>
                                        <Input
                                          value={el.config.btnLink || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { btnLink: e.target.value })}
                                          placeholder="/products"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-ink/10">
                                      <input
                                        type="checkbox"
                                        id={`showCountdown-${el.id}`}
                                        checked={el.config.showCountdown || false}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { showCountdown: e.target.checked })}
                                        className="w-4 h-4 rounded border-ink text-brand-orange focus:ring-brand-orange cursor-pointer"
                                      />
                                      <Label htmlFor={`showCountdown-${el.id}`} className="cursor-pointer font-bold text-xs">
                                        Tampilkan Countdown Timer di Hero
                                      </Label>
                                    </div>

                                    {el.config.showCountdown && (
                                      <div className="space-y-3 animate-slide-up">
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label>Tanggal Berakhir</Label>
                                            <Input
                                              type="date"
                                              value={(el.config.countdownEnd || "").split("T")[0] || ""}
                                              onChange={(e) => {
                                                const timePart = (el.config.countdownEnd || "").split("T")[1] || "00:00";
                                                updateElementConfig(activeSegment.id, el.id, { countdownEnd: `${e.target.value}T${timePart}` });
                                              }}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Jam Berakhir</Label>
                                            <Input
                                              type="time"
                                              value={(() => {
                                                const timePart = (el.config.countdownEnd || "").split("T")[1] || "";
                                                return timePart.substring(0, 5);
                                              })()}
                                              onChange={(e) => {
                                                const datePart = (el.config.countdownEnd || "").split("T")[0] || new Date().toISOString().split("T")[0];
                                                updateElementConfig(activeSegment.id, el.id, { countdownEnd: `${datePart}T${e.target.value}:00` });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-2 border-t border-ink/10">
                                      <input
                                        type="checkbox"
                                        id={`showVerifyBtn-${el.id}`}
                                        checked={el.config.showVerifyBtn || false}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { showVerifyBtn: e.target.checked })}
                                        className="w-4 h-4 rounded border-ink text-brand-orange focus:ring-brand-orange cursor-pointer"
                                      />
                                      <Label htmlFor={`showVerifyBtn-${el.id}`} className="cursor-pointer font-bold text-xs">
                                        Tampilkan Tombol Verifikasi / Login
                                      </Label>
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-ink/10">
                                      <Label className="font-bold text-xs uppercase tracking-wider text-brand-orange">
                                        Foto Lookbook Hero Banner (Carousel)
                                      </Label>
                                      
                                      {(() => {
                                        const imagesList = el.config.images || (el.config.image ? [el.config.image] : []);
                                        return (
                                          <div className="space-y-3">
                                            {imagesList.length > 0 && (
                                              <div className="grid grid-cols-2 gap-3 border border-ink/10 p-3 rounded bg-cream/5">
                                                {imagesList.map((imgUrl: string, idx: number) => (
                                                  <div key={idx} className="relative border-2 border-ink rounded p-2 bg-cream/15 flex flex-col items-center gap-2 group shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
                                                    <img
                                                      src={imgUrl}
                                                      alt={`Slide ${idx + 1}`}
                                                      className="w-full h-24 rounded object-cover border border-ink/10"
                                                    />
                                                    {/* Actions for each slide */}
                                                    <div className="flex gap-1.5 justify-center w-full mt-1">
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={idx === 0}
                                                        onClick={() => {
                                                          const newImgs = [...imagesList];
                                                          const temp = newImgs[idx];
                                                          newImgs[idx] = newImgs[idx - 1];
                                                          newImgs[idx - 1] = temp;
                                                          updateElementConfig(activeSegment.id, el.id, {
                                                            images: newImgs,
                                                            image: newImgs[0] || "",
                                                          });
                                                        }}
                                                        className="h-7 w-7 p-0 border-2 border-ink cursor-pointer hover:bg-neutral-100 flex items-center justify-center"
                                                        title="Geser Kiri"
                                                      >
                                                        <ChevronUp className="-rotate-90 w-3.5 h-3.5" />
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={idx === imagesList.length - 1}
                                                        onClick={() => {
                                                          const newImgs = [...imagesList];
                                                          const temp = newImgs[idx];
                                                          newImgs[idx] = newImgs[idx + 1];
                                                          newImgs[idx + 1] = temp;
                                                          updateElementConfig(activeSegment.id, el.id, {
                                                            images: newImgs,
                                                            image: newImgs[0] || "",
                                                          });
                                                        }}
                                                        className="h-7 w-7 p-0 border-2 border-ink cursor-pointer hover:bg-neutral-100 flex items-center justify-center"
                                                        title="Geser Kanan"
                                                      >
                                                        <ChevronDown className="-rotate-90 w-3.5 h-3.5" />
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => {
                                                          const newImgs = imagesList.filter((_: any, i: number) => i !== idx);
                                                          updateElementConfig(activeSegment.id, el.id, {
                                                            images: newImgs,
                                                            image: newImgs[0] || "",
                                                          });
                                                        }}
                                                        className="h-7 w-7 p-0 border-2 border-ink bg-red-500 text-white cursor-pointer hover:bg-red-600 flex items-center justify-center"
                                                        title="Hapus"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </Button>
                                                    </div>
                                                    <span className="absolute top-1 left-1 bg-ink text-cream text-[8px] font-mono px-1.5 py-0.5 rounded font-black">
                                                      {idx + 1}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            
                                            <div className="space-y-1.5 mt-2">
                                              <Label className="text-[10px] font-black uppercase text-muted-foreground">Tambah Slide Foto Lookbook (Min. 1 Foto)</Label>
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, activeSegment.id, el.id, "images_append", el.type)}
                                                className="cursor-pointer text-xs"
                                              />
                                              <p className="text-[9px] text-muted-foreground font-medium">Foto yang diunggah akan dipotong ke rasio 5:6 dan disimpan secara lokal di folder backend/uploads.</p>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* MARQUEE CONFIG */}
                                {el.type === "marquee" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Teks Pengumuman (Pisahkan pesan dengan | )</Label>
                                      <Textarea
                                        value={el.config.text || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { text: e.target.value })}
                                        placeholder="Pesan 1 | Pesan 2 | Pesan 3..."
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* COUNTDOWN CONFIG */}
                                {el.type === "countdown" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Countdown</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Pre-Order Varsity Selesai Dalam:"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Sub-judul / Deskripsi</Label>
                                      <Textarea
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="Keterangan singkat..."
                                        rows={2}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Tanggal Target</Label>
                                        <Input
                                          type="date"
                                          value={(el.config.targetDate || "").split("T")[0] || ""}
                                          onChange={(e) => {
                                            const timePart = (el.config.targetDate || "").split("T")[1] || "00:00";
                                            updateElementConfig(activeSegment.id, el.id, { targetDate: `${e.target.value}T${timePart}` });
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Jam Target</Label>
                                        <Input
                                          type="time"
                                          value={(() => {
                                            const timePart = (el.config.targetDate || "").split("T")[1] || "";
                                            return timePart.substring(0, 5);
                                          })()}
                                          onChange={(e) => {
                                            const datePart = (el.config.targetDate || "").split("T")[0] || new Date().toISOString().split("T")[0];
                                            updateElementConfig(activeSegment.id, el.id, { targetDate: `${datePart}T${e.target.value}:00` });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Gaya Tampilan</Label>
                                      <select
                                        value={el.config.style || "full"}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { style: e.target.value })}
                                        className="w-full bg-cream border-2 border-ink rounded p-2 text-xs font-bold focus:outline-none"
                                      >
                                        <option value="full">Full Box</option>
                                        <option value="minimal">Minimalist</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* PRODUCT GRID CONFIG */}
                                {el.type === "product_grid" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Grid</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Premium Merchandise."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Sub-judul Atas</Label>
                                      <Input
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="03 — ARTICLE SHOP"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Sumber Produk</Label>
                                        <select
                                          value={el.config.source || "all"}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { source: e.target.value })}
                                          className="w-full bg-cream border-2 border-ink rounded p-2 text-xs font-bold focus:outline-none"
                                        >
                                          <option value="all">Semua Produk</option>
                                          <option value="featured">Hanya Featured</option>
                                          <option value="best_seller">Hanya Best Seller</option>
                                          <option value="slugs">Spesifik Slugs</option>
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Jumlah Maksimal Produk</Label>
                                        <Input
                                          type="number"
                                          value={el.config.maxItems || 3}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { maxItems: parseInt(e.target.value) || 3 })}
                                        />
                                      </div>
                                    </div>

                                    {el.config.source === "slugs" && (
                                      <div className="space-y-2 animate-slide-up">
                                        <Label>Pilih Produk Yang Ingin Ditampilkan</Label>
                                        <div className="border-2 border-ink rounded-md p-3 bg-cream/10 max-h-60 overflow-y-auto space-y-2">
                                          {dbProducts.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic p-2">Tidak ada produk tersedia.</p>
                                          ) : (
                                            dbProducts.map((prod) => {
                                              const selectedSlugs = (el.config.slugs || "")
                                                .split(",")
                                                .map((s: string) => s.trim())
                                                .filter(Boolean);
                                              const isChecked = selectedSlugs.includes(prod.slug);
                                              return (
                                                <label key={prod.id} className="flex items-center gap-2.5 p-1.5 hover:bg-ink/5 rounded cursor-pointer text-xs">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    className="accent-brand-orange w-4 h-4 cursor-pointer"
                                                    onChange={(e) => {
                                                      let newSlugs = [...selectedSlugs];
                                                      if (e.target.checked) {
                                                        if (!newSlugs.includes(prod.slug)) {
                                                          newSlugs.push(prod.slug);
                                                        }
                                                      } else {
                                                        newSlugs = newSlugs.filter((s) => s !== prod.slug);
                                                      }
                                                      updateElementConfig(activeSegment.id, el.id, { slugs: newSlugs.join(",") });
                                                    }}
                                                  />
                                                  {prod.image_url && (
                                                    <img src={resolveImageUrl(prod.image_url)} alt={prod.name} className="w-8 h-8 object-cover rounded border border-ink/10" />
                                                  )}
                                                  <span className="font-bold text-ink">{prod.name}</span>
                                                </label>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* CATEGORY SHOWCASE CONFIG */}
                                {el.type === "category_showcase" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Utama Section Kategori</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Pick your fit"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* IMAGE BANNER CONFIG */}
                                {el.type === "image_banner" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Tinggi Banner</Label>
                                      <select
                                        value={el.config.height || "md"}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { height: e.target.value })}
                                        className="w-full bg-cream border-2 border-ink rounded p-2 text-xs font-bold focus:outline-none"
                                      >
                                        <option value="sm">Kecil</option>
                                        <option value="md">Sedang</option>
                                        <option value="lg">Besar</option>
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Alt Gambar</Label>
                                        <Input
                                          value={el.config.alt || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { alt: e.target.value })}
                                          placeholder="Banner Promo"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Tautan / Link Klik</Label>
                                        <Input
                                          value={el.config.link || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { link: e.target.value })}
                                          placeholder="/products"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-ink/10">
                                      <Label>Pilih Gambar Banner</Label>
                                      {el.config.image ? (
                                        <div className="relative border-2 border-dashed border-ink/30 rounded p-3 bg-muted/20 flex flex-col items-center gap-2">
                                          <img
                                            src={resolveImageUrl(el.config.image)}
                                            alt="Banner"
                                            className="max-h-36 rounded object-cover border border-ink/10"
                                          />
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => updateElementConfig(activeSegment.id, el.id, { image: "" })}
                                            className="h-7 text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                                          >
                                            Hapus Gambar
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(e, activeSegment.id, el.id, "image", el.type)}
                                            className="cursor-pointer text-xs"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* TEXT BLOCK CONFIG */}
                                {el.type === "text_block" && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Judul Blok Teks</Label>
                                        <Input
                                          value={el.config.title || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                          placeholder="Judul"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Sub-judul Atas</Label>
                                        <Input
                                          value={el.config.subtitle || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                          placeholder="Sub-judul"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Konten / Paragraf Teks</Label>
                                      <Textarea
                                        value={el.config.body || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { body: e.target.value })}
                                        placeholder="Tulis konten..."
                                        rows={4}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Penjajaran Teks</Label>
                                      <div className="flex gap-2">
                                        {[
                                          { value: "left", label: "Kiri", icon: AlignLeft },
                                          { value: "center", label: "Tengah", icon: AlignCenter },
                                          { value: "right", label: "Kanan", icon: AlignRight },
                                        ].map((align) => {
                                          const Icon = align.icon;
                                          return (
                                            <button
                                              key={align.value}
                                              type="button"
                                              onClick={() => updateElementConfig(activeSegment.id, el.id, { alignment: align.value })}
                                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border-2 border-ink font-bold text-xs uppercase cursor-pointer ${
                                                el.config.alignment === align.value
                                                  ? "bg-ink text-cream"
                                                  : "bg-cream/40 text-ink hover:bg-cream/70"
                                              }`}
                                            >
                                              <Icon className="w-3.5 h-3.5" />
                                              {align.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                      <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase">Foto Kiri (Left Image)</Label>
                                        {el.config.leftImage ? (
                                          <div className="space-y-1.5">
                                            <div className="relative aspect-[3/4] rounded-lg border-2 border-ink overflow-hidden bg-neutral-900 shadow-sm w-32">
                                              <img src={resolveImageUrl(el.config.leftImage)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => updateElementConfig(activeSegment.id, el.id, { leftImage: "" })}
                                              className="w-full text-xs py-1 h-auto cursor-pointer"
                                            >
                                              Hapus
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <Input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleFileChange(e, activeSegment.id, el.id, "leftImage", el.type)}
                                              className="cursor-pointer text-xs"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase">Foto Kanan (Right Image)</Label>
                                        {el.config.rightImage ? (
                                          <div className="space-y-1.5">
                                            <div className="relative aspect-[3/4] rounded-lg border-2 border-ink overflow-hidden bg-neutral-900 shadow-sm w-32">
                                              <img src={resolveImageUrl(el.config.rightImage)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => updateElementConfig(activeSegment.id, el.id, { rightImage: "" })}
                                              className="w-full text-xs py-1 h-auto cursor-pointer"
                                            >
                                              Hapus
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <Input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleFileChange(e, activeSegment.id, el.id, "rightImage", el.type)}
                                              className="cursor-pointer text-xs"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* VALUE PROPS CONFIG */}
                                {el.type === "value_props" && (
                                  <div className="space-y-4">
                                    {el.config.items?.map((item: any, idx: number) => (
                                      <div key={idx} className="border border-ink/20 p-3 rounded space-y-2 bg-cream/10">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-brand-orange">PILAR #{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems.splice(idx, 1);
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                        <div className="space-y-2">
                                          <Input
                                            value={item.title || ""}
                                            onChange={(e) => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems[idx] = { ...newItems[idx], title: e.target.value };
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            placeholder="Judul Pilar"
                                            className="font-bold text-xs"
                                          />
                                          <Textarea
                                            value={item.description || ""}
                                            onChange={(e) => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems[idx] = { ...newItems[idx], description: e.target.value };
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            placeholder="Keterangan singkat..."
                                            rows={2}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const items = el.config.items || [];
                                        updateElementConfig(activeSegment.id, el.id, {
                                          items: [...items, { title: "", description: "" }],
                                        });
                                      }}
                                      className="w-full border border-ink text-ink font-bold text-xs uppercase py-2 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      + Tambah Pilar Nilai
                                    </Button>
                                  </div>
                                )}

                                {/* FAQ / TANYA BARA CONFIG */}
                                {el.type === "faq" && (
                                  <div className="space-y-4">
                                    <p className="text-xs text-muted-foreground font-semibold">
                                      Kelola daftar pertanyaan cepat dan jawaban otomatis maskot Bara di halaman <strong>Tanya Bara (/faq)</strong>.
                                    </p>
                                    {el.config.items?.map((item: any, idx: number) => (
                                      <div key={item.id || idx} className="border border-ink/20 p-3 rounded space-y-2 bg-cream/10">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-brand-orange">Pertanyaan Tanya Bara #{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems.splice(idx, 1);
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                        <div className="space-y-2">
                                          <Input
                                            value={item.q || ""}
                                            onChange={(e) => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems[idx] = { ...newItems[idx], q: e.target.value };
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            placeholder="Pertanyaan pembeli..."
                                            className="font-bold text-xs"
                                          />
                                          <Textarea
                                            value={item.a || ""}
                                            onChange={(e) => {
                                              const newItems = [...(el.config.items || [])];
                                              newItems[idx] = { ...newItems[idx], a: e.target.value };
                                              updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                            }}
                                            placeholder="Jawaban otomatis dari Bara..."
                                            rows={2}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const items = el.config.items || [];
                                        updateElementConfig(activeSegment.id, el.id, {
                                          items: [...items, { id: `faq-${Date.now()}`, q: "", a: "" }],
                                        });
                                      }}
                                      className="w-full border border-ink text-ink font-bold text-xs uppercase py-2 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      + Tambah Pertanyaan Tanya Bara
                                    </Button>
                                  </div>
                                )}

                                {/* LIMITED DROP CONFIG */}
                                {el.type === "limited_drop" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Utama Limited Drop</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Varsity FILKOM Edition"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Deskripsi</Label>
                                      <Textarea
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="Detail pre-order..."
                                        rows={2}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Produk Target</Label>
                                        <select
                                          value={el.config.productSlug || ""}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { productSlug: e.target.value })}
                                          className="w-full bg-cream border-2 border-ink rounded p-2.5 text-xs font-bold focus:outline-none"
                                        >
                                          <option value="">-- Pilih Produk --</option>
                                          {dbProducts.map((prod) => (
                                            <option key={prod.id} value={prod.slug}>
                                              {prod.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Tanggal Berakhir</Label>
                                        <Input
                                          type="date"
                                          value={(el.config.countdownEnd || "").split("T")[0] || ""}
                                          onChange={(e) => {
                                            const timePart = (el.config.countdownEnd || "").split("T")[1] || "00:00";
                                            updateElementConfig(activeSegment.id, el.id, { countdownEnd: `${e.target.value}T${timePart}` });
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Jam Berakhir</Label>
                                        <Input
                                          type="time"
                                          value={(() => {
                                            const timePart = (el.config.countdownEnd || "").split("T")[1] || "";
                                            return timePart.substring(0, 5);
                                          })()}
                                          onChange={(e) => {
                                            const datePart = (el.config.countdownEnd || "").split("T")[0] || new Date().toISOString().split("T")[0];
                                            updateElementConfig(activeSegment.id, el.id, { countdownEnd: `${datePart}T${e.target.value}:00` });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Stok Maksimum</Label>
                                        <Input
                                          type="number"
                                          value={el.config.stockMax || 100}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { stockMax: parseInt(e.target.value) || 100 })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Stok Terjual</Label>
                                        <Input
                                          type="number"
                                          value={el.config.stockCurrent || 0}
                                          onChange={(e) => updateElementConfig(activeSegment.id, el.id, { stockCurrent: parseInt(e.target.value) || 0 })}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-ink/10">
                                      <Label>Gambar Latar Belakang</Label>
                                      {el.config.image ? (
                                        <div className="relative border-2 border-dashed border-ink/30 rounded p-3 bg-muted/20 flex flex-col items-center gap-2">
                                          <img
                                            src={resolveImageUrl(el.config.image)}
                                            alt="Limited"
                                            className="max-h-36 rounded object-cover border border-ink/10"
                                          />
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => updateElementConfig(activeSegment.id, el.id, { image: "" })}
                                            className="h-7 text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                                          >
                                            Hapus Gambar
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(e, activeSegment.id, el.id, "image", el.type)}
                                            className="cursor-pointer text-xs"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* BUNDLE RECOMMENDATION CONFIG */}
                                {el.type === "bundle_recommendation" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Bagian</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Exclusive Bundles"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Sub-judul / Tagline</Label>
                                      <Input
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="SPECIAL SAVINGS PACKS"
                                      />
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-ink/10">
                                      <Label className="font-bold text-xs uppercase tracking-wider text-brand-orange">Daftar Bundle</Label>
                                      {el.config.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="border border-ink/20 p-3 rounded space-y-2 bg-cream/10">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold">BUNDLE #{idx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems.splice(idx, 1);
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Nama Bundle</Label>
                                              <Input
                                                value={item.name || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], name: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="Freshman Starter Pack"
                                                className="text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Tautan Tujuan</Label>
                                              <Input
                                                value={item.link || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], link: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="/products"
                                                className="text-xs"
                                              />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Harga Core (Promo)</Label>
                                              <Input
                                                value={item.price || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], price: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="Rp 120.000"
                                                className="text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Harga Coret (Asli)</Label>
                                              <Input
                                                value={item.originalPrice || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], originalPrice: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="Rp 145.000"
                                                className="text-xs"
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[10px]">Deskripsi Singkat</Label>
                                            <Input
                                              value={item.description || ""}
                                              onChange={(e) => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems[idx] = { ...newItems[idx], description: e.target.value };
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              placeholder="Deskripsi singkat isi paket..."
                                              className="text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[10px]">Isi Bundle (Dipisah koma)</Label>
                                            <Input
                                              value={item.itemsList || ""}
                                              onChange={(e) => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems[idx] = { ...newItems[idx], itemsList: e.target.value };
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              placeholder="Kaos, Totebag, Sticker"
                                              className="text-xs"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const items = el.config.items || [];
                                          updateElementConfig(activeSegment.id, el.id, {
                                            items: [
                                              ...items,
                                              { name: "", price: "", originalPrice: "", description: "", itemsList: "", link: "" }
                                            ],
                                          });
                                        }}
                                        className="w-full border border-ink text-ink font-bold text-xs uppercase py-2 hover:bg-neutral-100 cursor-pointer font-extrabold"
                                      >
                                        + Tambah Item Bundle
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* GALLERY CONFIG */}
                                {el.type === "gallery" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Bagian</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Campus Lookbook"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Sub-judul / Tagline</Label>
                                      <Input
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="@FILKOMMERCH"
                                      />
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-ink/10">
                                      <Label className="font-bold text-xs uppercase tracking-wider text-brand-orange">Foto Galeri</Label>
                                      {el.config.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="border border-ink/20 p-3 rounded space-y-2 bg-cream/10">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold">FOTO #{idx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems.splice(idx, 1);
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                          
                                          <div className="space-y-1">
                                            <Label className="text-[10px]">Caption</Label>
                                            <Input
                                              value={item.caption || ""}
                                              onChange={(e) => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems[idx] = { ...newItems[idx], caption: e.target.value };
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              placeholder="Caption foto..."
                                              className="text-xs"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <Label className="text-[10px]">Gambar</Label>
                                            {item.image ? (
                                              <div className="relative border border-ink/20 rounded p-1.5 bg-background flex items-center gap-2">
                                                <img src={resolveImageUrl(item.image)} className="w-12 h-12 object-cover rounded" alt="" />
                                                <Button
                                                  type="button"
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => {
                                                    const newItems = [...(el.config.items || [])];
                                                    newItems[idx] = { ...newItems[idx], image: "" };
                                                    updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                  }}
                                                  className="h-6 text-[8px] uppercase font-bold cursor-pointer"
                                                >
                                                  Hapus Gambar
                                                </Button>
                                              </div>
                                            ) : (
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (!file) return;
                                                  const formData = new FormData();
                                                  formData.append("file", file);
                                                  try {
                                                    toast.loading("Mengunggah gambar...");
                                                    const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                                                      method: "POST",
                                                      body: formData,
                                                      headers: { "ngrok-skip-browser-warning": "true" },
                                                    });
                                                    const data = await uploadRes.json();
                                                    toast.dismiss();
                                                    if (data.success && data.url) {
                                                      const newItems = [...(el.config.items || [])];
                                                      newItems[idx] = { ...newItems[idx], image: data.url };
                                                      updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                      toast.success("Gambar berhasil diunggah!");
                                                    } else {
                                                      toast.error("Gagal mengunggah gambar");
                                                    }
                                                  } catch (err) {
                                                    toast.dismiss();
                                                    console.error(err);
                                                    toast.error("Gagal mengunggah");
                                                  }
                                                }}
                                                className="cursor-pointer text-xs"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const items = el.config.items || [];
                                          updateElementConfig(activeSegment.id, el.id, {
                                            items: [...items, { id: `gal-${Date.now()}`, image: "", caption: "" }],
                                          });
                                        }}
                                        className="w-full border border-ink text-ink font-bold text-xs uppercase py-2 hover:bg-neutral-100 cursor-pointer font-extrabold"
                                      >
                                        + Tambah Foto Galeri
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* TESTIMONIAL CONFIG */}
                                {el.type === "testimonial" && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Judul Bagian</Label>
                                      <Input
                                        value={el.config.title || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { title: e.target.value })}
                                        placeholder="Campus Voices"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Sub-judul / Tagline</Label>
                                      <Input
                                        value={el.config.subtitle || ""}
                                        onChange={(e) => updateElementConfig(activeSegment.id, el.id, { subtitle: e.target.value })}
                                        placeholder="TESTIMONIALS"
                                      />
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-ink/10">
                                      <Label className="font-bold text-xs uppercase tracking-wider text-brand-orange">Daftar Testimoni</Label>
                                      {el.config.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="border border-ink/20 p-3 rounded space-y-2 bg-cream/10">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold">TESTIMONI #{idx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems.splice(idx, 1);
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Nama Mahasiswa</Label>
                                              <Input
                                                value={item.name || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], name: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="Rizwan Dak"
                                                className="text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px]">Prodi / Angkatan</Label>
                                              <Input
                                                value={item.role || ""}
                                                onChange={(e) => {
                                                  const newItems = [...(el.config.items || [])];
                                                  newItems[idx] = { ...newItems[idx], role: e.target.value };
                                                  updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                                }}
                                                placeholder="Informatika 2024"
                                                className="text-xs"
                                              />
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <Label className="text-[10px]">Isi Testimoni</Label>
                                            <Textarea
                                              value={item.content || ""}
                                              onChange={(e) => {
                                                const newItems = [...(el.config.items || [])];
                                                newItems[idx] = { ...newItems[idx], content: e.target.value };
                                                updateElementConfig(activeSegment.id, el.id, { items: newItems });
                                              }}
                                              placeholder="Tulis ulasan..."
                                              className="text-xs"
                                              rows={2}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const items = el.config.items || [];
                                          updateElementConfig(activeSegment.id, el.id, {
                                            items: [...items, { id: `test-${Date.now()}`, name: "", role: "", content: "" }],
                                          });
                                        }}
                                        className="w-full border border-ink text-ink font-bold text-xs uppercase py-2 hover:bg-neutral-100 cursor-pointer font-extrabold"
                                      >
                                        + Tambah Ulasan
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {activeSegment.elements?.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-ink/20 rounded-md text-xs text-muted-foreground font-mono bg-cream/5">
                          Belum ada elemen di segmen ini.
                          <br />
                          Silakan klik tombol <strong>"+ Tambah Elemen"</strong> di atas.
                        </div>
                      )}
                    </div>
                  </div>
                </fieldset>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Real-time Live Preview Mockup (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-4 space-y-4">
            <h2 className="display text-xs tracking-widest text-muted-foreground uppercase font-black flex items-center gap-2">
              Pratinjau Halaman Beranda
            </h2>

            {/* Browser Mockup Frame */}
            <div className="w-full border-4 border-ink rounded-lg shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] bg-background flex flex-col h-[750px] overflow-hidden select-none">
              {/* Browser Header Bar */}
              <div className="bg-ink text-cream h-9 px-4 flex items-center justify-between border-b-2 border-ink shrink-0 select-none">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="bg-white/10 text-cream/70 text-[8px] px-6 py-0.5 rounded font-mono truncate max-w-[150px] font-bold">
                  filkommerch.com/preview
                </div>
                <div className="w-8 shrink-0" />
              </div>

              {/* Navbar Mockup */}
              <div className="bg-background border-b border-ink/10 px-3 py-2 flex items-center justify-between h-9 shrink-0">
                <div className="flex items-center gap-1 font-bold text-[9px] text-ink uppercase">
                  <span className="w-3.5 h-3.5 bg-ink rounded-full" /> FILKOM MERCH
                </div>
                <div className="flex gap-2 text-[7px] font-bold text-muted-foreground">
                  <span>SHOP</span>
                  <span>PRE-ORDER</span>
                </div>
              </div>

              {/* Scrollable Browser Body */}
              <div className="flex-1 overflow-y-auto bg-background text-foreground text-[10px]">
                {/* Dynamically render segments and elements in order */}
                {segments
                  .filter((s) => s.enabled)
                  .map((seg) => {
                    const isSelected = selectedSegmentId === seg.id;
                    const borderStyle = isSelected
                      ? "border-2 border-brand-orange bg-brand-orange/5"
                      : "border-b border-ink/10";

                    return (
                      <div
                        key={seg.id}
                        onClick={() => setSelectedSegmentId(seg.id)}
                        className={`relative cursor-pointer transition-all hover:bg-black/5 ${borderStyle}`}
                        title="Klik untuk sunting segmen ini"
                      >
                        {/* Selected Indicator Ribbon */}
                        {isSelected && (
                          <div className="absolute top-0 left-0 bg-brand-orange text-ink font-mono text-[6px] px-1.5 py-0.5 rounded-br font-bold z-20">
                            EDITING: {seg.title}
                          </div>
                        )}

                        {/* Elements inside segment */}
                        <div className="space-y-0.5">
                          {seg.elements?.map((el) => {
                            return (
                              <div key={el.id} className="relative">
                                {/* HERO BANNER PREVIEW */}
                                {el.type === "hero_banner" && (
                                  <div className="bg-cream p-3 relative grid grid-cols-12 gap-2 items-center min-h-[140px]">
                                    <div className="col-span-8 space-y-1">
                                      <div className="text-[5.5px] text-brand-orange font-bold uppercase tracking-wider">
                                        {el.config.subLabel || "FILKOM MERCH"}
                                      </div>
                                      <h3 className="display text-base text-ink leading-tight font-extrabold uppercase whitespace-pre-line">
                                        {el.config.title || "Wear Your Faculty."}
                                      </h3>
                                      <p className="text-[7px] text-muted-foreground line-clamp-2 leading-relaxed">
                                        {el.config.subtitle}
                                      </p>
                                      {el.config.showCountdown && (
                                        <div className="bg-white border border-ink/10 px-1 py-0.5 rounded font-mono text-[6.5px] text-brand-orange w-fit font-bold">
                                          ⏱️ Target: {el.config.countdownEnd?.slice(0, 10) || "Belum diatur"}
                                        </div>
                                      )}
                                      <button className="bg-ink text-cream font-bold text-[6px] tracking-widest px-2 py-0.5 uppercase rounded-sm pointer-events-none mt-0.5">
                                        {el.config.btnText || "SHOP NOW"}
                                      </button>
                                    </div>
                                    <div className="col-span-4 bg-brand-blue/15 aspect-[5/6] rounded border border-ink/10 flex flex-col justify-center items-center overflow-hidden h-full relative group">
                                      {(() => {
                                        const uploadedImages = el.config.images || (el.config.image ? [el.config.image] : []);
                                        const previewImages = uploadedImages.length > 0 ? uploadedImages : [varsityEdutech, workJacket];
                                        if (previewImages.length > 0) {
                                          return (
                                            <>
                                              <img src={resolveImageUrl(previewImages[0])} className="w-full h-full object-cover opacity-80" alt="" />
                                              {previewImages.length > 1 && (
                                                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5 z-10">
                                                  {previewImages.map((_: any, pIdx: number) => (
                                                    <div
                                                      key={pIdx}
                                                      className={`w-1 h-1 rounded-full ${pIdx === 0 ? "bg-brand-orange" : "bg-white/60"}`}
                                                    />
                                                  ))}
                                                </div>
                                              )}
                                            </>
                                          );
                                        }
                                        return <span className="text-[6px] text-muted-foreground font-mono">Lookbook</span>;
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* MARQUEE PREVIEW */}
                                {el.type === "marquee" && (
                                  <div className="bg-ink text-cream py-1 px-3 text-[7.5px] tracking-wider text-center font-bold truncate">
                                    📢 {el.config.text || "PENGUMUMAN BERJALAN..."}
                                  </div>
                                )}

                                {/* COUNTDOWN PREVIEW */}
                                {el.type === "countdown" && (
                                  <div className="bg-ink text-cream p-3 text-center space-y-1">
                                    <div className="text-[7px] text-cream/70 font-bold uppercase">{el.config.title}</div>
                                    {el.config.subtitle && (
                                      <div className="text-[6px] text-cream/50 leading-tight line-clamp-1">{el.config.subtitle}</div>
                                    )}
                                    <div className="flex justify-center gap-1.5 font-mono text-brand-orange font-bold text-[10px]">
                                      <span>02 HARI</span>
                                      <span>:</span>
                                      <span>15 JAM</span>
                                      <span>:</span>
                                      <span>40 DET</span>
                                    </div>
                                  </div>
                                )}

                                {/* PRODUCT GRID PREVIEW */}
                                {el.type === "product_grid" && (
                                  <div className="p-3 bg-background space-y-2">
                                    <div className="text-center">
                                      {el.config.subtitle && (
                                        <div className="text-[5.5px] tracking-widest font-extrabold text-brand-orange">{el.config.subtitle}</div>
                                      )}
                                      <h4 className="display text-xs text-ink font-bold leading-none mt-0.5">{el.config.title || "Products"}</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {Array.from({ length: Math.min(el.config.maxItems || 3, 3) }).map((_, i) => (
                                        <div key={i} className="border border-ink/15 bg-cream p-1 rounded flex flex-col justify-between aspect-[3/4]">
                                          <div className="bg-neutral-200 aspect-square rounded shrink-0 flex items-center justify-center text-[5.5px] text-muted-foreground font-mono uppercase truncate">
                                            {el.config.source === "slugs" ? (el.config.slugs?.split(",")[i] || "Product") : "Mock Product"}
                                          </div>
                                          <div className="text-[5.5px] font-bold truncate mt-1 text-ink">
                                            Premium Fit Article
                                          </div>
                                          <div className="text-[5.5px] font-extrabold text-brand-orange">
                                            Rp 150.000
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* CATEGORY SHOWCASE PREVIEW */}
                                {el.type === "category_showcase" && (
                                  <div className="p-3 bg-cream space-y-1">
                                    <h4 className="display text-[9px] text-ink font-bold uppercase">{el.config.title || "Pick your fit"}</h4>
                                    <div className="grid grid-cols-4 gap-1">
                                      {["JACKETS", "HOODIES", "TEES", "ACC"].map((cat) => (
                                        <div key={cat} className="bg-ink text-cream aspect-square rounded flex flex-col items-center justify-center p-0.5 border border-ink">
                                          <span className="text-[5.5px] font-bold text-center leading-none">{cat}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* IMAGE BANNER PREVIEW */}
                                {el.type === "image_banner" && (
                                  <div className="relative bg-neutral-900 overflow-hidden flex items-center justify-center" style={{ height: el.config.height === "sm" ? "40px" : el.config.height === "lg" ? "100px" : "70px" }}>
                                    {el.config.image ? (
                                      <img src={resolveImageUrl(el.config.image)} className="w-full h-full object-cover opacity-90" alt="" />
                                    ) : (
                                      <div className="text-cream/50 text-[6.5px] font-mono flex flex-col items-center">
                                        <ImageIcon className="w-3.5 h-3.5 mb-1" />
                                        <span>Image Banner ({el.config.height?.toUpperCase()})</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TEXT BLOCK PREVIEW */}
                                {el.type === "text_block" && (
                                  <div className="p-3 bg-background flex items-center justify-center gap-1.5" style={{ textAlign: el.config.alignment || "center" }}>
                                    {el.config.leftImage && (
                                      <div className="w-4 h-5 border border-ink/10 rounded shrink-0 bg-neutral-200 overflow-hidden">
                                        <img src={el.config.leftImage} className="w-full h-full object-cover" alt="" />
                                      </div>
                                    )}
                                    <div className="flex-1 space-y-0.5">
                                      {el.config.subtitle && <span className="text-[5.5px] tracking-wider text-brand-orange font-bold font-mono">{el.config.subtitle}</span>}
                                      <h4 className="display text-xs text-ink font-bold uppercase leading-none mt-0.5">{el.config.title}</h4>
                                      <p className="text-[6.5px] text-muted-foreground leading-relaxed font-medium mt-1 max-w-xs mx-auto">{el.config.body}</p>
                                    </div>
                                    {el.config.rightImage && (
                                      <div className="w-4 h-5 border border-ink/10 rounded shrink-0 bg-neutral-200 overflow-hidden">
                                        <img src={el.config.rightImage} className="w-full h-full object-cover" alt="" />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* VALUE PROPS PREVIEW */}
                                {el.type === "value_props" && (
                                  <div className="p-3 bg-cream grid grid-cols-2 gap-1.5">
                                    {el.config.items?.map((item: any, i: number) => (
                                      <div key={i} className="bg-white/60 p-1 rounded border border-ink/5 space-y-0.5">
                                        <div className="text-[6.5px] font-bold text-ink leading-tight">{item.title}</div>
                                        <div className="text-[5.5px] text-muted-foreground line-clamp-2 leading-tight">{item.description}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* FAQ PREVIEW */}
                                {el.type === "faq" && (
                                  <div className="p-3 bg-background space-y-1">
                                    <div className="text-[5.5px] tracking-widest text-center text-muted-foreground font-bold font-mono">FAQ TANYA BARA</div>
                                    <div className="space-y-1">
                                      {el.config.items?.slice(0, 2).map((item: any, i: number) => (
                                        <div key={i} className="border border-ink/10 rounded p-1 bg-cream/35 space-y-0.5">
                                          <div className="text-[6px] text-brand-orange font-bold">{item.q}</div>
                                          <div className="text-[5px] text-muted-foreground line-clamp-1">{item.a}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* LIMITED DROP PREVIEW */}
                                 {el.type === "limited_drop" && (
                                   <div className="p-3 bg-ink text-cream grid grid-cols-12 gap-2 items-center">
                                     <div className="col-span-8 space-y-1">
                                       <div className="bg-brand-orange text-ink font-mono font-bold text-[4.5px] px-1 py-0.2 rounded w-fit uppercase">
                                         LIMITED PRE-ORDER
                                       </div>
                                       <h4 className="display text-[9px] text-cream font-bold truncate leading-tight mt-0.5">
                                         {el.config.title}
                                       </h4>
                                       <p className="text-[5.5px] text-cream/70 line-clamp-1 leading-tight">
                                         {el.config.subtitle}
                                       </p>
                                       <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
                                         <div
                                           className="bg-brand-orange h-full"
                                           style={{
                                             width: `${(el.config.stockCurrent / el.config.stockMax) * 100}%`,
                                           }}
                                         />
                                       </div>
                                       <div className="text-[5px] text-cream/40 font-mono">
                                         Stok: {el.config.stockCurrent}/{el.config.stockMax} pcs
                                       </div>
                                     </div>
                                     <div className="col-span-4 bg-white/5 aspect-[4/5] rounded border border-white/10 flex items-center justify-center overflow-hidden h-full">
                                       {el.config.image ? (
                                         <img src={resolveImageUrl(el.config.image)} className="w-full h-full object-cover" alt="" />
                                       ) : (
                                         <span className="text-[5px] text-cream/40 font-mono">Product</span>
                                       )}
                                     </div>
                                   </div>
                                 )}

                                 {/* BUNDLE RECOMMENDATION PREVIEW */}
                                 {el.type === "bundle_recommendation" && (
                                   <div className="p-3 bg-cream border border-ink/20 rounded space-y-1">
                                     <div className="text-[5px] tracking-[0.2em] text-brand-orange font-bold uppercase">
                                       {el.config.subtitle || "PROMO BUNDLE"}
                                     </div>
                                     <h4 className="display text-[9px] text-ink font-bold uppercase truncate">
                                       {el.config.title || "Rekomendasi Bundling"}
                                     </h4>
                                     <div className="grid grid-cols-2 gap-1.5 mt-2">
                                       {(el.config.items || []).slice(0, 2).map((bundle: any, bIdx: number) => (
                                         <div key={bIdx} className="bg-background border border-ink p-1.5 rounded space-y-1">
                                           <div className="flex justify-between items-center text-[5.5px]">
                                             <span className="font-bold truncate max-w-[70%]">{bundle.name}</span>
                                             <span className="text-brand-orange font-mono font-bold">{bundle.price}</span>
                                           </div>
                                           <p className="text-[4.5px] text-muted-foreground line-clamp-1">{bundle.description}</p>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 {/* GALLERY PREVIEW */}
                                 {el.type === "gallery" && (
                                   <div className="p-3 bg-background border border-ink/20 rounded space-y-1">
                                     <div className="text-[5px] tracking-[0.2em] text-brand-orange font-bold uppercase">
                                       {el.config.subtitle || "CAMPUS LOGBOOK"}
                                     </div>
                                     <h4 className="display text-[9px] text-ink font-bold uppercase truncate">
                                       {el.config.title || "Lifestyle Gallery"}
                                     </h4>
                                     <div className="grid grid-cols-4 gap-1 mt-2">
                                       {(el.config.items || []).slice(0, 4).map((photo: any, gIdx: number) => (
                                         <div key={gIdx} className="aspect-[4/5] bg-cream border border-ink rounded overflow-hidden relative">
                                           {photo.image ? (
                                             <img src={resolveImageUrl(photo.image)} className="w-full h-full object-cover" alt="" />
                                           ) : (
                                             <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-[4px] text-muted-foreground font-mono truncate">Look</div>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 {/* TESTIMONIAL PREVIEW */}
                                 {el.type === "testimonial" && (
                                   <div className="p-3 bg-cream border border-ink/20 rounded space-y-1">
                                     <div className="text-[5px] tracking-[0.2em] text-brand-orange font-bold uppercase">
                                       {el.config.subtitle || "CAMPUS VOICES"}
                                     </div>
                                     <h4 className="display text-[9px] text-ink font-bold uppercase truncate">
                                       {el.config.title || "Testimonials"}
                                     </h4>
                                     <div className="grid grid-cols-2 gap-1.5 mt-2">
                                       {(el.config.items || []).slice(0, 2).map((t: any, tIdx: number) => (
                                         <div key={tIdx} className="bg-background border border-ink p-1.5 rounded space-y-1">
                                           <div className="flex text-brand-orange text-[3px] gap-0.5">
                                             <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                                           </div>
                                           <p className="text-[5px] italic text-ink line-clamp-2 leading-tight">
                                             "{t.content}"
                                           </p>
                                           <div className="text-[4px] font-mono text-muted-foreground pt-1 border-t border-neutral-100 truncate">
                                             {t.name} ({t.role})
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                              </div>
                            );
                          })}

                          {seg.elements?.length === 0 && (
                            <div className="flex items-center justify-center h-10 text-muted-foreground text-[8px] font-mono border border-dashed border-ink/10 bg-cream/10">
                              (Segmen Kosong)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {segments.filter((s) => s.enabled).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground text-xs font-mono">
                    Semua segmen dinonaktifkan.
                  </div>
                )}

                {/* Footer Mockup */}
                <div className="bg-ink text-cream/60 text-[6px] p-3 text-center border-t border-ink shrink-0 font-mono">
                  © 2026 Filkom Merch UB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        elementType={cropperContext?.elementType || ""}
        aspectRatio={cropperContext?.elementType === "hero_banner" ? 5 / 6 : 1}
        onClose={() => {
          if (cropperImageSrc) {
            URL.revokeObjectURL(cropperImageSrc);
          }
          setCropperImageSrc("");
          setOriginalFile(null);
          setCropperContext(null);
          setCropperOpen(false);
        }}
        onCropComplete={(croppedFile) => void executeUpload(croppedFile)}
        onUploadOriginal={() => {
          if (originalFile) {
            void executeUpload(originalFile);
          }
        }}
      />
    </div>
  );
}
