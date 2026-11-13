import Foundation

/// The one piece of business logic, shared by the phone screen and the car
/// screen: "where am I, and what's nearby?". Results are nearest-first.
///
/// Where the answer comes from:
///  - Inside a mirrored region: the mirror on this phone. No network needed.
///  - Anywhere else: the live API, as before.
///  - Live API unreachable: the mirror again, if it has anything reasonably close.
@MainActor
final class PlaceFinder {
    /// One shared instance (a singleton), so both screens use the same location manager.
    static let shared = PlaceFinder()

    let location = LocationProvider()
    private let client = LocatorClient()
    private let mirror = MirrorStore()

    func findNearby() async throws -> [Place] {
        let here = try await location.currentLocation()
        let latitude = here.coordinate.latitude
        let longitude = here.coordinate.longitude

        // Kick off a background check for a newer mirror. It is not awaited, so
        // it never delays the answer; its result is used on the next search.
        Task { await mirror.refreshIfStale() }

        if let snapshot = mirror.snapshot, snapshot.covers(latitude: latitude, longitude: longitude) {
            return snapshot.nearest(latitude: latitude, longitude: longitude, limit: LocatorConfig.maxResults)
        }

        do {
            let places = try await client.fetchNearby(latitude: latitude, longitude: longitude)
            return Array(places.prefix(LocatorConfig.maxResults))
        } catch {
            // Offline just outside the mirrored area: mirrored results are still
            // useful if they're close. Far away they'd be misleading, so give up.
            if let snapshot = mirror.snapshot {
                let places = snapshot.nearest(latitude: latitude, longitude: longitude, limit: LocatorConfig.maxResults)
                if let closest = places.first, closest.distanceMiles <= LocatorConfig.offlineFallbackMiles {
                    return places
                }
            }
            throw error
        }
    }
}

extension Place {
    /// Apple Maps deep link for DRIVING directions to this place. Same idea as
    /// `appleMapsUrl` in src/directions.ts, with `dirflg=d` (drive) instead of walk.
    var drivingDirectionsURL: URL {
        URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=d")!
    }
}
