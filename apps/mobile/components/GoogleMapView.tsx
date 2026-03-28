import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView, InfoWindow } from '@react-google-maps/api';
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
  deviceCoords?: { lat: number; lng: number } | null;
}

export default function GoogleMapView({ venues, selectedCity, deviceCoords }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  const [activeVenue, setActiveVenue] = useState<VenueMarker | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const city = selectedCity ?? DEFAULT_CITY;
  const center = {
    lat: city.lat ?? DEFAULT_CITY.lat!,
    lng: city.lng ?? DEFAULT_CITY.lng!,
  };

  useEffect(() => {
    if (!mapRef.current || !city.lat || !city.lng) return;
    mapRef.current.panTo({ lat: city.lat, lng: city.lng });
  }, [city.lat, city.lng]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return <div style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={13}
      onLoad={onLoad}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
      onClick={() => setActiveVenue(null)}
    >
      {venues.map((venue) => (
        <OverlayView
          key={venue.id}
          position={{ lat: venue.lat, lng: venue.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            onClick={(e) => { e.stopPropagation(); setActiveVenue(venue); }}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#d4a017',
              border: '2.5px solid #fff',
              cursor: 'pointer',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
          />
        </OverlayView>
      ))}

      {deviceCoords && (
        <OverlayView
          position={{ lat: deviceCoords.lat, lng: deviceCoords.lng }}
          mapPaneName={OverlayView.OVERLAY_LAYER}
        >
          <div style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#4285F4',
            border: '2.5px solid #fff',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 4px rgba(66,133,244,0.2)',
          }} />
        </OverlayView>
      )}

      {activeVenue && (
        <InfoWindow
          position={{ lat: activeVenue.lat, lng: activeVenue.lng }}
          onCloseClick={() => setActiveVenue(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -12) }}
        >
          <div style={{ minWidth: 160, maxWidth: 240, background: '#1a1a1a', margin: -11, padding: 12, borderRadius: 8, fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#d4a017', marginBottom: 6 }}>
              {activeVenue.name}
            </div>
            {activeVenue.events.map((event, i) => (
              <a
                key={event.id}
                href={`/events/${event.id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderTop: i === 0 ? 'none' : '1px solid #333',
                  paddingTop: i === 0 ? 0 : 6,
                  marginTop: i === 0 ? 0 : 6,
                }}
              >
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>
                  {formatTime(event.startsAt)} · {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#eee' }}>
                  {event.title}
                </div>
              </a>
            ))}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
