import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface GeoState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeoState {
  const setLocation = useStore((s) => s.setLocation);
  const stored = useStore((s) => s.userLocation);

  const [state, setState] = useState<GeoState>({
    lat: stored?.lat ?? null,
    lng: stored?.lng ?? null,
    error: null,
    loading: !stored,
  });

  useEffect(() => {
    if (stored) {
      setState({ lat: stored.lat, lng: stored.lng, error: null, loading: false });
      return;
    }

    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported by your browser.', loading: false }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation(lat, lng);
        setState({ lat, lng, error: null, loading: false });
      },
      (err) => {
        setState(s => ({ ...s, error: err.message, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return state;
}
