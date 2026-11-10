import Foundation

/// The one piece of business logic, shared by the phone screen and the car
/// screen: "where am I, and what's nearby?". Results arrive nearest-first
/// because the locator endpoint already sorts by distance.
@MainActor
final class PlaceFinder {
    /// One shared instance (a singleton), so both screens use the same location manager.
    static let shared = PlaceFinder()

    let location = LocationProvider()
    private let client = LocatorClient()

    func findNearby() async throws -> [Place] {
        let here = try await location.currentLocation()
        let places = try await client.fetchNearby(
            latitude: here.coordinate.latitude,
            longitude: here.coordinate.longitude
        )
        return Array(places.prefix(LocatorConfig.maxResults))
    }
}

extension Place {
    /// Apple Maps deep link for DRIVING directions to this place. Same idea as
    /// `appleMapsUrl` in src/directions.ts, with `dirflg=d` (drive) instead of walk.
    var drivingDirectionsURL: URL {
        URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=d")!
    }
}
