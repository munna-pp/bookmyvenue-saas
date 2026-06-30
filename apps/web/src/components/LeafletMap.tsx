'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing marker icons in Next.js/Leaflet build
L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export interface MapMarker {
  id: string;
  title: string;
  price: number;
  lat: number;
  lng: number;
  slug: string;
  imageUrl?: string;
  venueType: string;
}

interface LeafletMapProps {
  markers: MapMarker[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  radiusCircle?: {
    lat: number;
    lng: number;
    radiusInMeters: number;
  };
}

export default function LeafletMap({
  markers,
  center = [19.0760, 72.8777], // Mumbai default
  zoom = 12,
  radiusCircle,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize Map once
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);

      // OpenStreetMap Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) return;

    // 2. Clear old markers
    layerGroup.clearLayers();
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // 3. Add new markers
    const leafletMarkers: L.Marker[] = [];
    markers.forEach((m) => {
      if (!m.lat || !m.lng) return;

      const popupHtml = `
        <div style="width: 180px; font-family: sans-serif;">
          ${
            m.imageUrl
              ? `<img src="${m.imageUrl}" alt="${m.title}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 4px; margin-bottom: 6px;" />`
              : ''
          }
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${m.title}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: capitalize; margin-bottom: 4px;">${m.venueType.replace(/_/g, ' ')}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-weight: bold; color: #10b981; font-size: 13px;">₹${m.price.toLocaleString()}/day</span>
            <a href="/venues/${m.slug}" target="_blank" style="font-size: 11px; text-decoration: none; color: #3b82f6; font-weight: bold;">View Details</a>
          </div>
        </div>
      `;

      const marker = L.marker([m.lat, m.lng])
        .bindPopup(popupHtml)
        .addTo(layerGroup);
      
      leafletMarkers.push(marker);
    });

    // 4. Add radius search helper circle if provided
    if (radiusCircle && radiusCircle.lat && radiusCircle.lng) {
      const circle = L.circle([radiusCircle.lat, radiusCircle.lng], {
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.2,
        radius: radiusCircle.radiusInMeters,
      }).addTo(map);

      circleRef.current = circle;
    }

    // 5. Fit bounds to contain markers
    if (leafletMarkers.length > 0) {
      const group = L.featureGroup(leafletMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    } else if (radiusCircle) {
      map.setView([radiusCircle.lat, radiusCircle.lng], 13);
    } else {
      map.setView(center, zoom);
    }
  }, [markers, center, zoom, radiusCircle]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
}
