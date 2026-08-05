/**
 * Skeleton placeholder for product cards in the catalog grid.
 * Matches the exact card dimensions & layout used in products.tsx.
 */
export function SkeletonProductCard() {
  return (
    <div className="flex flex-col bg-card border-2 border-ink/20 rounded-xl overflow-hidden h-full animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-cream/80 border-b-2 border-ink/10 relative">
        {/* Badge skeleton */}
        <div className="absolute top-3 left-3 h-5 w-20 bg-ink/10 rounded" />
      </div>

      {/* Content placeholder */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          <div className="h-3 w-20 bg-ink/10 rounded mb-2" />
          {/* Product name line 1 */}
          <div className="h-4 w-full bg-ink/15 rounded mb-1.5" />
          {/* Product name line 2 */}
          <div className="h-4 w-3/4 bg-ink/10 rounded" />
        </div>

        <div className="mt-4 pt-4 border-t border-cream flex items-end justify-between">
          <div className="space-y-1.5">
            {/* Price */}
            <div className="h-5 w-28 bg-ink/15 rounded" />
            {/* Strikethrough price */}
            <div className="h-3 w-20 bg-ink/8 rounded" />
          </div>
          {/* Cart button */}
          <div className="w-9 h-9 bg-ink/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a grid of skeleton cards (default 6).
 */
export function SkeletonProductGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}
