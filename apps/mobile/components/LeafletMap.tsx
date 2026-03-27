import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { DEFAULT_CITY } from '../constants/cities';
import type { VenueMarker } from './PlatformMap';
import type { CityOption } from '../constants/cities';

const EVENT_TYPE_LABELS: Record<string, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam Session',
  COMEDY_NIGHT: 'Comedy Night',
  POETRY_SLAM: 'Poetry Slam',
  OPEN_STAGE: 'Open Stage',
  WORKSHOP: 'Workshop',
  OPEN_STUDIO: 'Open Studio',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

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
            <div style={{ minWidth: 160, maxWidth: 240, fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#d4a017', marginBottom: 6 }}>
                {venue.name}
              </div>
              {venue.events.map((event) => (
                <a
                  key={event.id}
                  href={`/events/${event.id}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderTop: '1px solid #eee', paddingTop: 5, marginTop: 5 }}
                >
                  <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>
                    {formatTime(event.startsAt)}
                    {' · '}
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 1, color: '#111' }}>
                    {event.title}
                  </div>
                </a>
              ))}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
