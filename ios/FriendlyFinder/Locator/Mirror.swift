import Foundation

// The mirror: a local copy of every place in the regions we care about, so the
// app can answer "what's nearest?" without calling the API at all.
//
// These types match places.json, written by the weekly job (lambda/mirror.ts)
// and described in lib/types.ts as `MirrorSnapshot`.

/// A rectangle on the map that the mirror covers completely.
struct MirrorRegion: Codable {
    let name: String
    let south: Double
    let west: Double
    let north: Double
    let east: Double

    func contains(latitude: Double, longitude: Double) -> Bool {
        latitude >= south && latitude <= north && longitude >= west && longitude <= east
    }
}

/// A mirrored place. Unlike `Place` it has no distance, because that depends on
/// where you are; `place(distanceMiles:)` fills it in.
struct MirrorPlace: Codable {
    let name: String
    let type: String
    let lat: Double
    let lng: Double
    let address: String
    let city: String
    let state: String
    let zip: String
    let phone: String
    /// Date the product last sold here, as "YYYYMMDD". `String?` means "may be absent".
    let lastSold: String?

    func place(distanceMiles: Double) -> Place {
        Place(
            name: name, type: type, distanceMiles: distanceMiles, lat: lat, lng: lng,
            address: address, city: city, state: state, zip: zip, phone: phone
        )
    }
}

struct MirrorSnapshot: Codable {
    let generatedAt: String
    let regions: [MirrorRegion]
    let places: [MirrorPlace]

    /// True when the given point is inside a mirrored region, i.e. the mirror
    /// can be trusted to know the nearest place.
    func covers(latitude: Double, longitude: Double) -> Bool {
        regions.contains { $0.contains(latitude: latitude, longitude: longitude) }
    }

    /// The `limit` closest places to a point, nearest first. Measuring all
    /// ~1,000 places takes well under a millisecond, so no spatial index is needed.
    func nearest(latitude: Double, longitude: Double, limit: Int) -> [Place] {
        places
            .map { $0.place(distanceMiles: milesBetween(latitude, longitude, $0.lat, $0.lng)) }
            .sorted { $0.distanceMiles < $1.distanceMiles }
            .prefix(limit)
            .map { $0 } // prefix() returns a slice; this turns it back into an Array
    }
}

/// Great-circle ("as the crow flies") distance in miles, by the haversine
/// formula. The same maths as src/bearing.ts in the web app.
func milesBetween(_ lat1: Double, _ lng1: Double, _ lat2: Double, _ lng2: Double) -> Double {
    let earthRadiusMiles = 3958.8
    let toRadians = Double.pi / 180
    let dLat = (lat2 - lat1) * toRadians
    let dLng = (lng2 - lng1) * toRadians
    let a = sin(dLat / 2) * sin(dLat / 2)
        + cos(lat1 * toRadians) * cos(lat2 * toRadians) * sin(dLng / 2) * sin(dLng / 2)
    return earthRadiusMiles * 2 * atan2(sqrt(a), sqrt(1 - a))
}
