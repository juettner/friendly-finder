import Foundation

enum LocatorError: LocalizedError {
    case badStatus(Int)

    var errorDescription: String? {
        switch self {
        case .badStatus(let code): return "The locator responded with HTTP \(code)."
        }
    }
}

/// HTTP client for the locator endpoint. The Swift equivalent of src/client.ts.
struct LocatorClient {
    /// `async throws` = "this suspends without blocking a thread, and may fail".
    /// Callers write `try await client.fetchNearby(...)`. It is the same idea as
    /// returning a CompletableFuture, but it reads like ordinary sequential code.
    func fetchNearby(latitude: Double, longitude: Double) async throws -> [Place] {
        // Round to 3 decimals (~100 m), same as the web client, so nearby
        // requests share the endpoint's one-hour cache.
        var components = URLComponents(url: LocatorConfig.endpoint, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "lat", value: String(format: "%.3f", latitude)),
            URLQueryItem(name: "lng", value: String(format: "%.3f", longitude)),
        ]

        var request = URLRequest(url: components.url!)
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw LocatorError.badStatus(http.statusCode)
        }
        return try JSONDecoder().decode(LocatorResponse.self, from: data).places
    }
}
