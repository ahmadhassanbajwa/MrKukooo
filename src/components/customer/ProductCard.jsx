import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';

export default function ProductCard({ product, onCustomize }) {
  const { name, price, image_url, is_available, has_sizes, sizes, description } = product;
  const displayPrice = has_sizes && sizes?.length > 0 ? Math.min(...sizes.map(s => s.price)) : price;
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div 
      onClick={(e) => { 
        if (is_available) {
          e.preventDefault(); 
          e.stopPropagation(); 
          onCustomize(product); 
        }
      }}
      className={`bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-2xs hover:shadow-sm hover:border-gray-300 transition-all duration-200 flex flex-col justify-between overflow-hidden p-3 sm:p-4 relative group h-full select-none ${
        is_available ? 'cursor-pointer' : 'opacity-70'
      }`}
    >
      {/* Top Heart Icon */}
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsLiked(!isLiked);
        }}
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 p-1.5 rounded-md bg-white/90 hover:bg-white border border-gray-200/80 text-primary transition-colors cursor-pointer shadow-2xs"
        aria-label="Save to favorites"
      >
        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isLiked ? 'fill-primary text-primary' : 'stroke-[2]'}`} />
      </button>

      {/* Product Image Area */}
      <div className="relative w-full aspect-square max-h-32 sm:max-h-40 flex items-center justify-center pt-1 pb-2">
        <img
          src={image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'}
          alt={name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-102"
          loading="lazy"
        />
        
        {!is_available && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
            <span className="bg-primary text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-2xs">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="flex flex-col flex-1 justify-between mt-1">
        <div>
          <h3 className="text-xs sm:text-sm md:text-[15px] font-bold text-gray-900 tracking-tight leading-snug line-clamp-1 sm:line-clamp-2">
            {name}
          </h3>
          
          {description && (
            <p className="text-[11px] sm:text-xs text-gray-500 font-normal mt-1 line-clamp-2 leading-relaxed min-h-[22px] sm:min-h-[28px]">
              {description}
            </p>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="mt-2.5 sm:mt-3 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-gray-900">Rs {displayPrice}</span>
            {has_sizes && (
              <span className="text-[10px] text-gray-400 font-medium">onwards</span>
            )}
          </div>

          <button
            type="button"
            disabled={!is_available}
            onClick={(e) => {
              e.stopPropagation();
              if (is_available) onCustomize(product);
            }}
            className="w-full mt-2.5 bg-primary hover:bg-primary-hover active:translate-y-[0.5px] text-white font-medium py-2 sm:py-2.2 px-3 rounded-md text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-primary-hover/40"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Add to Bowl</span>
          </button>
        </div>
      </div>
    </div>
  );
}
