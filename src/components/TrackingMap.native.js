import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors } from '../constants/theme';

export default function TrackingMap({ customerLocation, providerLocation }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const coordinates = [customerLocation, providerLocation].filter(Boolean);
    if (coordinates.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coordinates, {
        animated: true,
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      });
    }
  }, [customerLocation, providerLocation]);

  if (!customerLocation) return null;

  return (
    <MapView
      ref={mapRef}
      initialRegion={{
        ...customerLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      style={styles.map}
    >
      <Marker coordinate={customerLocation} description="Service location" pinColor="#2563eb" title="Customer" />
      {providerLocation ? (
        <>
          <Marker coordinate={providerLocation} description="Live provider location" pinColor="#dc2626" title="Provider" />
          <Polyline
            coordinates={[customerLocation, providerLocation]}
            strokeColor="#64748b"
            strokeWidth={3}
          />
        </>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { height: 360, width: '100%' } });
