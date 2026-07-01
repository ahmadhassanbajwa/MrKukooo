import { useEffect, useState, useRef } from 'react';
import ProductCard from './ProductCard';

export default function MenuSection({
  categories,
  products,
  onCustomize,
  selectedBranchId,
  initialActiveCategory
}) {
  const [activeTab, setActiveTab] = useState(initialActiveCategory || '');
  const categoryRefs = useRef({});
  const isScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  // Filter out products not available for this branch or globally
  const validProducts = products.filter(product => {
    if (!product.is_available) return false;
    if (selectedBranchId && product.branch_ids && product.branch_ids.length > 0) {
      if (!product.branch_ids.includes(selectedBranchId)) return false;
    }
    return true;
  });

  // Group products by category
  const categoriesWithProducts = categories.map(cat => ({
    ...cat,
    products: validProducts.filter(p => p.category_id === cat.id)
  }));

  useEffect(() => {
    if (categoriesWithProducts.length > 0 && !activeTab) {
      setActiveTab(categoriesWithProducts[0].id);
    }
  }, [categoriesWithProducts, activeTab]);

  useEffect(() => {
    // If mounted with an initial category that isn't the first one, pause observer briefly
    // to allow the external scroll to finish.
    if (initialActiveCategory) {
      isScrolling.current = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => { isScrolling.current = false; }, 1000);
    }
  }, [initialActiveCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isScrolling.current) {
            setActiveTab(entry.target.id);
            // Scroll the top nav to show the active tab
            const navElement = document.getElementById(`nav-${entry.target.id}`);
            if (navElement) {
              navElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        });
      },
      { rootMargin: '-160px 0px -60% 0px' }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categoriesWithProducts]);

  const scrollToCategory = (id) => {
    setActiveTab(id);
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => { isScrolling.current = false; }, 800);

    const element = categoryRefs.current[id];
    if (element) {
      const yOffset = -150; // Tight gap below sticky nav
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div id="menu-section" className="relative flex flex-col min-h-screen">
      {/* Sticky Top Bar for Categories */}
      <div className="sticky top-[76px] z-30 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 pt-5 pb-3 mb-8 -mx-6 px-6 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {categoriesWithProducts.map((cat) => (
            <button
              key={cat.id}
              id={`nav-${cat.id}`}
              onClick={() => scrollToCategory(cat.id)}
              className={`flex-shrink-0 px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === cat.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-accent border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Products Feed */}
      <div className="space-y-12 pb-24">
        {categoriesWithProducts.length > 0 ? (
          categoriesWithProducts.map((cat) => (
            <div
              key={cat.id}
              id={cat.id}
              ref={(el) => (categoryRefs.current[cat.id] = el)}
              className="scroll-mt-40"
            >
              <h2 className="text-3xl font-black text-accent uppercase tracking-tighter mb-6 inline-block border-b-4 border-primary pb-1">
                {cat.name}
              </h2>
              
              {cat.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onCustomize={onCustomize}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 italic font-semibold">
                  Items coming soon...
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
            <div className="text-4xl">🍕🥖🛵</div>
            <h3 className="text-xl font-black text-accent">No Delicacies Found</h3>
            <p className="text-sm font-semibold text-gray-400 max-w-sm mx-auto">
              We couldn't find items for the selected branch. Try switching branch locations!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
