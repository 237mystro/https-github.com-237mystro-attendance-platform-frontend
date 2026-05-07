export const OFFICE_COORDINATES = {
  latitude: parseFloat(process.env.REACT_APP_OFFICE_LATITUDE) || 4.1025,
  longitude: parseFloat(process.env.REACT_APP_OFFICE_LONGITUDE) || 9.3908
};

export const BUEA_COORDINATES = OFFICE_COORDINATES;
export const VERIFICATION_RADIUS = parseInt(process.env.REACT_APP_VERIFICATION_RADIUS, 10) || 20;

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = '';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }

        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};

export const calculateDistance = (coords1, coords2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371e3;
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);
  const deltaLat = toRad(coords2.latitude - coords1.latitude);
  const deltaLng = toRad(coords2.longitude - coords1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
};

export const verifyLocation = (userCoords) => {
  const distance = calculateDistance(userCoords, OFFICE_COORDINATES);

  return {
    isWithinRadius: distance <= VERIFICATION_RADIUS,
    distance,
    maxDistance: VERIFICATION_RADIUS,
    allowed: distance <= VERIFICATION_RADIUS
  };
};

export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 100)} cm`;
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(2)} km`;
};
