export interface LatLng {
  lat: number;
  lng: number;
}

export type PlaceType = "bar" | "store";

export interface Place {
  name: string;
  type: PlaceType;
  distanceMiles: number;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  /** Date the product was last sold here, as YYYYMMDD. Absent when upstream omits it. */
  lastSold?: string;
}

export interface BarsResponse {
  origin: LatLng;
  count: number;
  places: Place[];
}

/** A rectangle on the map that the mirror promises to cover completely. */
export interface Region {
  name: string;
  south: number;
  west: number;
  north: number;
  east: number;
}

/** A mirrored place. No distance: that depends on where the reader is standing. */
export type MirrorPlace = Omit<Place, "distanceMiles">;

/** The mirror file (places.json) the scheduled job writes and the iOS app reads. */
export interface MirrorSnapshot {
  generatedAt: string;
  regions: Region[];
  count: number;
  places: MirrorPlace[];
}
