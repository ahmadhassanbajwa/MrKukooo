import { useEffect, useRef } from 'react';

export default function BranchFooterMap({ branches, selectedBranchId, onSelectBranch }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.L || !branches || branches.length === 0) return;

    window.setCustomerViewBranch = (branchId) => {
      onSelectBranch(branchId);
    };

    const timer = setTimeout(() => {
      const mapElement = mapContainerRef.current;
      if (!mapElement) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const activeBr = branches.find(b => b.id === selectedBranchId) || branches[0];
      const mapInstance = window.L.map(mapElement).setView([activeBr.lat, activeBr.lng], 14);
      mapRef.current = mapInstance;

      window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data &copy; Google'
      }).addTo(mapInstance);

      branches.forEach(br => {
        const marker = window.L.marker([br.lat, br.lng]).addTo(mapInstance);
        const popupContent = `
          <div style="font-family: sans-serif; text-align: center;">
            <strong style="color: #C8102E; font-size: 14px;">${br.name}</strong><br/>
            <span style="font-size: 11px; color: #555;">${br.address}</span><br/>
            <button 
              onclick="window.setCustomerViewBranch && window.setCustomerViewBranch('${br.id}')"
              style="margin-top: 6px; background-color: #F2A900; border: 1px solid #111; border-radius: 4px; padding: 4px 8px; font-weight: bold; cursor: pointer; font-size: 10px;"
            >
              Order from this Branch
            </button>
          </div>
        `;
        marker.bindPopup(popupContent);
        if (br.id === selectedBranchId) {
          marker.openPopup();
        }
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [branches, selectedBranchId, onSelectBranch]);

  return (
    <div 
      ref={mapContainerRef}
      id="customer-branch-map" 
      className="w-full h-80 rounded-2xl comic-border comic-shadow relative z-0" 
    />
  );
}
