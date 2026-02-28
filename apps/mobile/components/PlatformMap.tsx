import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const ASTORIA: [number, number] = [40.7721, -73.9302];

export default function PlatformMap() {
  return (
    <MapContainer
      center={ASTORIA}
      zoom={14}
      style={{ flex: 1, height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <CircleMarker center={ASTORIA} radius={10} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8 }}>
        <Popup>Astoria, Queens, NY</Popup>
      </CircleMarker>
    </MapContainer>
  );
}
