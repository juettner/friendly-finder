import CoreLocation
import Foundation

/// One place carrying the product. Mirrors `Place` in lib/types.ts.
///
/// `Codable` is Swift's built-in JSON mapping: because the property names match
/// the JSON keys, the compiler generates the (de)serialiser for us, the way
/// Jackson would for a plain Java record.
struct Place: Codable, Identifiable, Hashable {
    let name: String
    let type: String // "bar" or "store"
    let distanceMiles: Double
    let lat: Double
    let lng: Double
    let address: String
    let city: String
    let state: String
    let zip: String
    let phone: String

    /// SwiftUI lists need a stable identity per row.
    var id: String { "\(name)|\(lat)|\(lng)" }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }

    /// The locator returns names in ALL CAPS; "Corner Market" reads better at a glance.
    var displayName: String { name.capitalized }

    var streetLine: String { address.capitalized }

    var cityLine: String { "\(city.capitalized), \(state) \(zip)" }

    var distanceText: String { String(format: "%.1f mi", distanceMiles) }

    var typeText: String { type == "bar" ? "Bar" : "Store" }
}

/// The full response body. Mirrors `BarsResponse` in lib/types.ts.
struct LocatorResponse: Codable {
    let count: Int
    let places: [Place]
}
