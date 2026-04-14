const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/** Haversine great-circle distance in km */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Grid cell key at ~11 km resolution (0.1° ≈ 11 km) */
export function gridCellKey(lat: number, lng: number): string {
    return `${Math.round(lat * 10)}:${Math.round(lng * 10)}`;
}

/** All 9 grid cell keys in a 3×3 neighbourhood around a point */
export function adjacentGridKeys(lat: number, lng: number): string[] {
    const gLat = Math.round(lat * 10);
    const gLng = Math.round(lng * 10);
    const keys: string[] = [];
    for (let dLat = -1; dLat <= 1; dLat++)
        for (let dLng = -1; dLng <= 1; dLng++)
            keys.push(`${gLat + dLat}:${gLng + dLng}`);
    return keys;
}

/** Approximate degree radius for a km radius (equatorial approximation) */
export function kmToDegrees(km: number): number {
    return km / 111;
}
