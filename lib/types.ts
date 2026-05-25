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
}

export interface BarsResponse {
  origin: LatLng;
  count: number;
  places: Place[];
}
