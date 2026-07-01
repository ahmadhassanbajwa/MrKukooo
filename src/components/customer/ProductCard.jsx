import { Heart } from 'lucide-react';

export default function ProductCard({ product, onCustomize }) {
  const { name, price, image_url, is_available, has_sizes, sizes } = product;
  const displayPrice = has_sizes && sizes?.length > 0 ? Math.min(...sizes.map(s => s.price)) : price;

  return (
    <div 
      onClick={(e) => { 
        if(is_available) {
          e.preventDefault(); 
          e.stopPropagation(); 
          onCustomize(product); 
        }
      }}
      className={`bg-white h-full relative group transition-all duration-300 flex flex-col ${
        is_available ? 'cursor-pointer hover:shadow-xl' : 'opacity-70'
      }`}
    >
      {/* Heart Icon */}
      <div className="absolute top-4 right-4 z-20">
        <button className="text-primary hover:text-primary-hover transition-colors cursor-pointer">
          <Heart className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      <div className="p-5 pb-0">
        {/* 3 Red Squares */}
        <div className="flex gap-1 mb-3">
          <div className="w-[14px] h-[14px] bg-primary"></div>
          <div className="w-[14px] h-[14px] bg-primary"></div>
          <div className="w-[14px] h-[14px] bg-primary"></div>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-[22px] font-black text-accent tracking-tight leading-none uppercase">
          {name}
        </h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-tight">
            {product.description}
          </p>
        )}
      </div>

      {/* Image and Ribbon Container */}
      <div className="relative mt-4 flex-1 flex items-center justify-center min-h-[220px] pb-6">
        <img
          src={image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'}
          alt={name}
          className="w-[85%] h-[85%] object-contain z-10 transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Price Ribbon */}
        <div className="absolute right-0 top-6 z-20 flex items-center drop-shadow-sm">
          {/* Triangle Cutout */}
          <div className="w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[12px] border-r-primary"></div>
          {/* Main Ribbon Body */}
          <div className="bg-primary h-[32px] px-2 pr-4 flex items-baseline text-white tracking-tighter">
            <span className="text-[12px] font-bold mr-0.5">Rs</span>
            <span className="text-xl font-black">{displayPrice}</span>
          </div>
        </div>

        {!is_available && (
          <div className="absolute inset-0 bg-white/50 z-30 flex items-center justify-center">
            <span className="bg-primary text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
