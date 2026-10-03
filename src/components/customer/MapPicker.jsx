import { useEffect, useRef } from 'react';

export default function MapPicker({ currentBranch, customerCoords, setCustomerCoords, orderType, isCartOpen }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const coordsRef = useRef(customerCoords);

  useEffect(() => {
    coordsRef.current = customerCoords;
  }, [customerCoords]);

  useEffect(() => {
    if (!isCartOpen || orderType !== 'Delivery' || !currentBranch || !window.L) return;

    const timer = setTimeout(() => {
      const mapElement = mapContainerRef.current;
      if (!mapElement) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const mapInstance = window.L.map(mapElement).setView([currentBranch.lat, currentBranch.lng], 13);
      mapRef.current = mapInstance;

      window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data &copy; Google'
      }).addTo(mapInstance);

      const redIcon = window.L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const branchMarker = window.L.marker([currentBranch.lat, currentBranch.lng], { icon: redIcon }).addTo(mapInstance);
      branchMarker.bindPopup(`<strong>${currentBranch.name}</strong><br/>Store location`).openPopup();

      const customerMarker = window.L.marker([coordsRef.current.lat, coordsRef.current.lng], { draggable: true }).addTo(mapInstance);
      customerMarker.bindPopup(`<strong>Your Delivery Pin</strong><br/>Drag me to your address`).openPopup();
      customerMarkerRef.current = customerMarker;

      const zones = currentBranch.deliveryZones || [{ maxRadius: 5, charge: 0 }, { maxRadius: 15, charge: 150 }];
      const maxRadiusKm = zones.length > 0 ? Math.max(...zones.map(z => z.maxRadius)) : 15;

      window.L.circle([currentBranch.lat, currentBranch.lng], {
        radius: maxRadiusKm * 1000,
        color: '#EF4444',
        dashArray: '5, 5',
        fillOpacity: 0
      }).addTo(mapInstance);

      customerMarker.on('dragend', () => {
        const pos = customerMarker.getLatLng();
        setCustomerCoords({ lat: pos.lat, lng: pos.lng });
      });

      mapInstance.on('click', (e) => {
        customerMarker.setLatLng(e.latlng);
        setCustomerCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isCartOpen, orderType, currentBranch, setCustomerCoords]);

  useEffect(() => {
    if (customerMarkerRef.current) {
      const markerLatLng = customerMarkerRef.current.getLatLng();
      if (Math.abs(markerLatLng.lat - customerCoords.lat) > 0.0001 || Math.abs(markerLatLng.lng - customerCoords.lng) > 0.0001) {
        customerMarkerRef.current.setLatLng([customerCoords.lat, customerCoords.lng]);
      }
    }
  }, [customerCoords.lat, customerCoords.lng]);

  return (
    <div 
      ref={mapContainerRef} 
      id="checkout-delivery-map" 
      className="w-full h-64 rounded-xl comic-border comic-shadow-sm relative z-0" 
    />
  );
}
