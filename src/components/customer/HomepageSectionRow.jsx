
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
        <div className="flex overflow-x-auto gap-3.5 sm:gap-6 pb-6 pt-2 snap-x no-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="shrink-0 w-[125px] sm:w-[160px] snap-start">
              <button
                onClick={() => onItemClick(item.id)}
                className="w-full bg-white h-[125px] sm:h-[160px] rounded-full shadow-xs hover:shadow-md flex flex-col items-center justify-center p-3 relative group cursor-pointer transition-shadow"
              >
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-[75px] sm:w-[95px] h-[75px] sm:h-[95px] object-contain mb-1 group-hover:scale-105 transition-transform"
                />
                <h4 className="font-black text-[11px] sm:text-xs text-accent tracking-wide">{item.name}</h4>
                <div className="w-6 sm:w-8 h-[2px] bg-primary mt-0.5 opacity-100"></div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-2.5 sm:gap-4 pb-4 snap-x no-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="shrink-0 w-[165px] sm:w-[210px] md:w-[260px] snap-start flex">
              <ProductCard product={item} onCustomize={onItemClick} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
