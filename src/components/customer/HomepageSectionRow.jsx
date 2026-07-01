import React from 'react';
import { ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function HomepageSectionRow({ 
  section, 
  items, 
  type, // 'products' or 'categories'
  onItemClick, 
  onSeeMore 
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-6 relative mb-4">
      <div className="flex justify-between items-end pb-4 border-b border-gray-200">
        <div className="relative">
          <h3 className="text-3xl font-black tracking-tight text-accent uppercase leading-none pb-2">
            {section.name}
          </h3>
          <div className="absolute bottom-0 left-0 h-[3px] w-16 bg-primary"></div>
        </div>
        {onSeeMore && (
          <button 
            onClick={() => onSeeMore(section)}
            className="flex items-center gap-1 text-[11px] font-black text-accent uppercase tracking-wider hover:text-primary transition-colors cursor-pointer border-b-2 border-transparent hover:border-primary pb-1"
          >
            VIEW ALL <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {type === 'categories' ? (
        <div className="flex overflow-x-auto gap-8 pb-8 pt-4 snap-x no-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="shrink-0 w-[170px] snap-start">
              <button
                onClick={() => onItemClick(item.id)}
                className="w-full bg-white h-[170px] rounded-full shadow-sm hover:shadow-md flex flex-col items-center justify-center p-4 relative group cursor-pointer transition-shadow"
              >
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-[105px] h-[105px] object-contain mb-2 group-hover:scale-105 transition-transform"
                />
                <h4 className="font-black text-xs text-accent tracking-wide">{item.name}</h4>
                <div className="w-8 h-[2px] bg-primary mt-1 opacity-100"></div>
                <div className="absolute bottom-4 right-4 w-2.5 h-2.5 bg-gray-100 rounded-full"></div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="shrink-0 w-[270px] snap-start border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <ProductCard product={item} onCustomize={onItemClick} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
