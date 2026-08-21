import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export default function HeroCarousel({ activeOffers, onOfferClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeOffers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeOffers.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeOffers.length]);

  if (!activeOffers || activeOffers.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeOffers.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + activeOffers.length) % activeOffers.length);
  };

  return (
    <div className="relative w-full overflow-hidden bg-accent text-white group h-64 sm:h-80 md:h-[400px] lg:h-[450px] xl:h-[500px]">
      {activeOffers.map((offer, idx) => (
        <div
          key={offer.id}
          onClick={() => onOfferClick(offer)}
          style={
            offer.promo_image_url
              ? { backgroundImage: `url(${offer.promo_image_url})` }
              : {}
          }
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer bg-cover bg-center ${
            idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {/* Dark gradient overlay — fades from solid left to transparent right so text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />

          {/* Text content — sits above the overlay */}
          <div className="relative z-10 h-full flex flex-col justify-center p-6 sm:p-12 max-w-xl space-y-3 sm:space-y-4">
            <span className="inline-block w-fit bg-secondary text-accent text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              Special Promo Offer
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              {offer.title}
            </h2>
            {offer.redirect_type && offer.redirect_type !== 'none' && (
              <button className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl comic-border-sm comic-shadow-sm uppercase tracking-wider transition-all w-fit">
                Grab Deal Now <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      ))}

      {activeOffers.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex gap-2">
            {activeOffers.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? 'bg-secondary w-6' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
