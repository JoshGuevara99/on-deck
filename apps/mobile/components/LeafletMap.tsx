import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { DEFAULT_CITY } from '../constants/cities';
import type { VenueMarker } from './PlatformMap';
import type { CityOption } from '../constants/cities';

interface Props {
  venues: VenueMarker[];
  selectedCity: CityOption | null;
}

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, 13, { duration: 0.8 });
  }, [center?.[0], center?.[1]]);
  return null;
}

export default function LeafletMap({ venues, selectedCity }: Props) {
  const city = selectedCity ?? DEFAULT_CITY;
  const center: [number, number] | null =
    city.lat != null && city.lng != null ? [city.lat, city.lng] : null;
  const initialCenter: [number, number] = [DEFAULT_CITY.lat!, DEFAULT_CITY.lng!];

  return (
    <MapContainer
      center={center ?? initialCenter}
      zoom={13}
      style={{ flex: 1, height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapController center={center} />
      {venues.map((venue) => (
        <CircleMarker
          key={venue.id}
          center={[venue.lat, venue.lng]}
          radius={10}
          pathOptions={{ color: '#d4a017', fillColor: '#d4a017', fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{venue.name}</strong>
            <br />
            {venue.eventTitles.length === 1
              ? venue.eventTitles[0]
              : `${venue.eventTitles.length} events`}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
