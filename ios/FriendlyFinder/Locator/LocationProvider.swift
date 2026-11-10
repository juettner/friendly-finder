import CoreLocation

enum LocationError: LocalizedError {
    /// The user hasn't allowed location yet (or said no).
    case notAuthorized
    case unavailable

    var errorDescription: String? {
        switch self {
        case .notAuthorized: return "Location access hasn't been allowed."
        case .unavailable: return "Couldn't get your current location."
        }
    }
}

/// Wraps Apple's callback-style `CLLocationManager` in a single async call:
/// `let here = try await provider.currentLocation()`.
///
/// `@MainActor` pins this class to the main (UI) thread, which is where
/// CLLocationManager delivers its callbacks, so there is no locking to get wrong.
@MainActor
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    /// A "continuation" is the handle that resumes a suspended `await`.
    /// We park it here while waiting for the delegate callback below.
    private var pending: CheckedContinuation<CLLocation, Error>?

    override init() {
        super.init()
        manager.delegate = self
        // We only need to know roughly where the truck is to rank nearby places.
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    var isAuthorized: Bool {
        let status = manager.authorizationStatus
        return status == .authorizedWhenInUse || status == .authorizedAlways
    }

    var canAskForPermission: Bool {
        manager.authorizationStatus == .notDetermined
    }

    /// Shows the system "Allow location?" prompt. Only works on the PHONE
    /// screen; iOS never shows permission prompts on the car display.
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func currentLocation() async throws -> CLLocation {
        guard isAuthorized else { throw LocationError.notAuthorized }
        // If a request is already in flight, fail the old one rather than leak it.
        pending?.resume(throwing: LocationError.unavailable)
        return try await withCheckedThrowingContinuation { continuation in
            pending = continuation
            manager.requestLocation() // one-shot fix; answers via the delegate methods
        }
    }

    // MARK: - CLLocationManagerDelegate (callbacks from iOS)

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            guard let location = locations.last else { return }
            pending?.resume(returning: location)
            pending = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            pending?.resume(throwing: LocationError.unavailable)
            pending = nil
        }
    }
}
