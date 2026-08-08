import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { radius } from '../constants/theme';

function FitLocations({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 1) {
      map.setView(locations[0], 15);
    } else if (locations.length > 1) {
      map.fitBounds(locations, { padding: [40, 40] });
    }
  }, [locations, map]);

  return null;
}

export default function TrackingMap({ customerLocation, providerLocation }) {
  const customer = customerLocation
    ? [customerLocation.latitude, customerLocation.longitude]
    : null;
  const provider = providerLocation
    ? [providerLocation.latitude, providerLocation.longitude]
    : null;
  const locations = [customer, provider].filter(Boolean);

  if (!customer) return null;

  return (
    <MapContainer
      center={customer}
      style={{ height: 360, width: '100%', borderRadius: radius.large }}
      zoom={15}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={customer} pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 1 }} radius={10}>
        <Popup>Customer</Popup>
      </CircleMarker>
      {provider ? (
        <>
          <CircleMarker center={provider} pathOptions={{ color: '#b91c1c', fillColor: '#dc2626', fillOpacity: 1 }} radius={10}>
            <Popup>Provider</Popup>
          </CircleMarker>
          <Polyline positions={[customer, provider]} pathOptions={{ color: '#64748b', weight: 3 }} />
        </>
      ) : null}
      <FitLocations locations={locations} />
    </MapContainer>
  );
}
