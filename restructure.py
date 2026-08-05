import sys
import re

with open("frontend/src/routes/product.$slug.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the bottom review card
# It starts at: {/* REVIEW CARD SECTION */}
# It ends right before: {/* COLUMN 3: RIGHT STICKY CHECKOUT SIDEBAR BOX (3 Cols - Fixed Anchored) */}
pattern = r"            \{\/\* REVIEW CARD SECTION \*\/\}.*?(?=          \{\/\* COLUMN 3: RIGHT STICKY CHECKOUT SIDEBAR BOX \(3 Cols \- Fixed Anchored\) \*\/\} )"
content = re.sub(pattern, "", content, flags=re.DOTALL)

# Insert the new accordion review card
# Target: {/* Product Variant Selectors */}
accordion = """            {/* REVIEW CARD ACCORDION */}
            <div className="border-2 border-ink rounded-2xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mt-6 mb-6" id="ulasan-section">
              <button
                onClick={() => setIsReviewsOpen(!isReviewsOpen)}
                className="w-full bg-cream/40 py-4 px-5 flex items-center justify-between cursor-pointer hover:bg-cream transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-sm uppercase tracking-wider text-ink flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    Ulasan Pembeli ({reviewsData.totalReviews})
                  </h3>
                  <div className="flex items-baseline gap-1 bg-white border border-ink/20 px-2 py-0.5 rounded-md">
                    <span className="font-extrabold text-ink text-xs">{reviewsData.avgRating}</span>
                    <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                  </div>
                </div>
                <div className={`transition-transform duration-300 ${isReviewsOpen ? "rotate-180" : ""}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </button>
              
              {isReviewsOpen && (
                <div className="p-5 border-t-2 border-ink text-xs sm:text-sm bg-white animate-fade-in">
                  {loadingReviews ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Memuat ulasan produk...</p>
                  ) : reviewsData.reviews.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground font-medium">Belum ada ulasan untuk produk ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReviewSort("terbaru")}
                          className={`px-3 py-1.5 text-[11px] font-bold border-2 transition rounded-lg shrink-0 cursor-pointer ${
                            reviewSort === "terbaru" ? "bg-brand-orange text-ink border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-white text-ink border-ink hover:bg-cream"
                          }`}
                        >
                          Terbaru
                        </button>
                        <button
                          onClick={() => setReviewSort("dengan_foto")}
                          className={`px-3 py-1.5 text-[11px] font-bold border-2 transition rounded-lg shrink-0 cursor-pointer ${
                            reviewSort === "dengan_foto" ? "bg-brand-orange text-ink border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-white text-ink border-ink hover:bg-cream"
                          }`}
                        >
                          Dengan Foto
                        </button>
                      </div>

                      <div className="divide-y divide-border">
                        {displayedReviews.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-4 text-center">Tidak ada ulasan.</p>
                        ) : (
                          displayedReviews.map((rev) => (
                            <div key={rev.id} className="py-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-ink">{maskReviewerName(rev.name)}</span>
                                <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? "fill-amber-400 text-amber-500" : "text-gray-300 fill-gray-100"}`} />
                                  ))}
                                </div>
                                {formatSizeVariant(rev.variant) && (
                                  <span className="text-[10px] font-semibold text-muted-foreground bg-cream border border-ink/10 px-1.5 py-0.5 rounded">
                                    Ukuran: {formatSizeVariant(rev.variant)}
                                  </span>
                                )}
                              </div>
                              {rev.comment && (
                                <p className="text-xs text-ink/90 font-medium leading-relaxed mt-1">"{rev.comment}"</p>
                              )}
                              {rev.media_url && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {(() => {
                                    try {
                                      const urls = rev.media_url.startsWith("[") ? JSON.parse(rev.media_url) : [rev.media_url];
                                      return urls.map((url, idx) => (
                                        <div key={idx} className="shrink-0">
                                          {url.match(/\.(mp4|mov|webm)$/i) ? (
                                            <video src={resolveImageUrl(url)} className="w-20 h-20 object-cover rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" controls />
                                          ) : (
                                            <img src={resolveImageUrl(url)} alt={`Bukti Ulasan ${idx+1}`} className="w-20 h-20 object-cover rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-zoom-in hover:scale-105 transition-transform" onClick={() => { setActiveImage(resolveImageUrl(url) || ""); setIsZoomOpen(true); }} />
                                          )}
                                        </div>
                                      ));
                                    } catch (e) {
                                      return null;
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Variant Selectors */}"""

content = content.replace("            {/* Product Variant Selectors */}", accordionCode)

with open("frontend/src/routes/product.$slug.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
