import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import { claimSearchServerAction, submitClaimServerAction } from "@backend/server-actions";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/image-resolver";
export const Route = createFileRoute("/claimbatch1")({
  component: ClaimBatch1Page,
  head: () => ({
    meta: [
      { title: "Klaim Pesanan Batch 1 — Filkom Merch UB" },
      { name: "description", content: "Klaim pesanan pre-order batch 1 Anda untuk dihubungkan ke akun website." },
    ],
  }),
});

function ClaimBatch1Page() {
  const { user } = useAuth();
  
  const [nim, setNim] = useState("");
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim.trim() && !phone.trim()) {
      toast.error("Silakan isi NIM atau No HP (salah satu atau keduanya).");
      return;
    }
    
    setIsSearching(true);
    setHasSearched(false);
    
    try {
      // Hilangkan awalan 0 dari nomor HP jika ada (untuk akurasi)
      let cleanedPhone = phone.trim();
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.substring(1);
      }

      const res = await claimSearchServerAction({ 
        data: { 
          nim: nim.trim() || undefined, 
          phone: cleanedPhone || undefined 
        } 
      });
      
      if (res.success) {
        setSearchResults(res.orders || []);
        setHasSearched(true);
        if (res.orders.length === 0) {
          toast.info("Tidak ditemukan pesanan yang belum diklaim dengan data tersebut.");
        }
      } else {
        toast.error(res.error || "Gagal mencari pesanan.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem saat pencarian.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitClaim = async (orderId: string) => {
    if (!user) {
      toast.error("Kamu harus login terlebih dahulu untuk mengajukan klaim.");
      return;
    }

    setSubmittingOrderId(orderId);
    try {
      const res = await submitClaimServerAction({ data: { orderId } });
      if (res.success) {
        toast.success(res.message || "Klaim berhasil diajukan!");
        // Hapus dari hasil pencarian
        setSearchResults(prev => prev.filter(o => o.order_id !== orderId));
      } else {
        toast.error(res.error || "Gagal mengajukan klaim.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setSubmittingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-black uppercase tracking-tight text-ink">Klaim Pesanan <span className="text-brand-orange">Batch 1</span></h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Jika kamu melakukan pembelian merchandise pada Pre-Order Batch 1 (via Google Form / Manual) dan pesananmu belum muncul di riwayat transaksi, silakan cari dan klaim di sini untuk menghubungkannya ke akunmu.
          </p>
        </div>

        <div className="bg-white border-4 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
          <div className="p-6 border-b-4 border-ink bg-cream/40">
            <h2 className="font-bold text-lg uppercase flex items-center gap-2">
              <Search className="w-5 h-5 text-brand-orange" />
              Cari Data Pesananmu
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Masukkan NIM dan/atau No HP yang kamu gunakan saat mengisi form pemesanan.</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-sm uppercase">NIM Pembeli</label>
                  <input
                    type="text"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="Contoh: 215150xxx"
                    className="w-full px-4 py-3 border-2 border-ink rounded-lg font-medium outline-none focus:border-brand-orange transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-sm uppercase">Nomor HP</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812345xxx"
                    className="w-full px-4 py-3 border-2 border-ink rounded-lg font-medium outline-none focus:border-brand-orange transition-colors"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSearching || (!nim.trim() && !phone.trim())}
                  className="w-full sm:w-auto bg-brand-orange text-white px-8 py-3 rounded-lg font-black uppercase tracking-wider border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-y-1 active:shadow-none hover:bg-brand-orange/90 transition-all disabled:opacity-50 disabled:active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cari Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {hasSearched && (
          <div className="mt-10 animate-fade-in">
            <h3 className="font-black text-xl uppercase mb-6 flex items-center gap-2">
              Hasil Pencarian 
              <span className="bg-ink text-white text-xs px-3 py-1 rounded-full">{searchResults.length}</span>
            </h3>
            
            {searchResults.length === 0 ? (
              <div className="bg-cream/30 border-2 border-ink border-dashed rounded-xl p-8 text-center">
                <p className="font-bold text-lg text-ink">Tidak Ada Pesanan Ditemukan</p>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                  Coba periksa kembali penulisan NIM atau No HP. Jika tetap tidak ada, mungkin pesananmu sudah diklaim, atau kamu memakai data lain saat mengisi form.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.map((order) => (
                  <div key={order.order_id} className="bg-[#FCFAF7] border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
                    
                    {/* Header Info */}
                    <div className="p-4 sm:p-5 border-b-2 border-ink flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-cream/50">
                      <div>
                        <div className="inline-block bg-ink text-white text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 tracking-widest">
                          ID: {order.order_id}
                        </div>
                        <h4 className="font-black text-xl text-ink uppercase tracking-wide">{order.customer_name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tanggal Pesan: {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} pukul {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Total Pembayaran</p>
                        <p className="font-black text-2xl text-brand-orange">
                          Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    {/* Table Items */}
                    <div className="p-4 sm:p-5 bg-white">
                      <h5 className="font-black text-sm uppercase text-ink mb-4">ITEM YANG DIBELI</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b-2 border-ink/10 text-muted-foreground">
                              <th className="pb-3 font-semibold min-w-[200px]">Nama Produk</th>
                              <th className="pb-3 font-semibold text-center min-w-[150px]">Varian</th>
                              <th className="pb-3 font-semibold text-center min-w-[100px]">Harga Qty</th>
                              <th className="pb-3 font-semibold text-right min-w-[100px]">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-ink/5 border-b-2 border-ink/10 border-dashed">
                            {order.items && order.items.map((item: any, idx: number) => {
                              const variantParts = [];
                              if (item.size && item.size !== "Standard" && item.size !== "") variantParts.push(item.size);
                              if (item.color && item.color !== "") variantParts.push(item.color);
                              const variantText = variantParts.length > 0 ? variantParts.join(" / ") : "-";
                              
                              const imageUrl = item.primary_image_url || item.image_url;
                              let displayPrice = Number(item.unit_price || 0);
                              if (displayPrice === 0) {
                                displayPrice = Number(item.p_filkom_price) > 0 ? Number(item.p_filkom_price) : (Number(item.p_promo_price) > 0 ? Number(item.p_promo_price) : Number(item.p_price || 0));
                              }
                              const displaySubtotal = Number(item.subtotal) > 0 ? Number(item.subtotal) : displayPrice * (item.quantity || 1);

                              return (
                                <tr key={idx} className="hover:bg-cream/10 transition-colors">
                                  <td className="py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-[#F5F5F5] rounded border border-ink/20 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                        <img 
                                          src={imageUrl ? (imageUrl.startsWith('http') ? imageUrl : resolveImageUrl(imageUrl)) : (item.product_name.toLowerCase().includes("kaos") || item.product_name.toLowerCase().includes("t-shirt") ? "/mockup-kaos.png" : item.product_name.toLowerCase().includes("jaket") || item.product_name.toLowerCase().includes("jacket") ? "/mockup-jaket.png" : item.product_name.toLowerCase().includes("lanyard") ? "/mockup-lanyard.png" : item.product_name.toLowerCase().includes("totebag") || item.product_name.toLowerCase().includes("tote") ? "/mockup-totebag.png" : item.product_name.toLowerCase().includes("keychain") || item.product_name.toLowerCase().includes("ganci") ? "/mockup-keychain.png" : item.product_name.toLowerCase().includes("sticker") || item.product_name.toLowerCase().includes("stiker") ? "/mockup-sticker.png" : "/logo-fm.png")}
                                          alt={item.product_name}
                                          className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                      </div>
                                      <span className="font-bold text-ink uppercase">{item.product_name}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-center text-muted-foreground">{variantText}</td>
                                  <td className="py-4 text-center whitespace-nowrap">
                                    Rp {displayPrice.toLocaleString("id-ID")} <span className="font-black text-ink ml-1">{item.quantity}</span>
                                  </td>
                                  <td className="py-4 text-right font-black text-brand-blue whitespace-nowrap">
                                    Rp {displaySubtotal.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-5 flex justify-between items-center">
                        <p className="text-muted-foreground font-bold uppercase text-xs">Total Pembayaran:</p>
                        <p className="font-black text-brand-orange text-xl">Rp {Number(order.gross_amount).toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-cream/30 border-t-2 border-ink flex justify-end">
                      <button
                        onClick={() => handleSubmitClaim(order.order_id)}
                        disabled={submittingOrderId === order.order_id}
                        className="bg-emerald-500 text-white px-8 py-3 rounded font-black uppercase tracking-widest border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-y-1 active:shadow-none hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
                      >
                        {submittingOrderId === order.order_id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Klaim Pesanan Ini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
