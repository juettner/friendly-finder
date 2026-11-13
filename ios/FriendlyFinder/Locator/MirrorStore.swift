import Foundation

/// Owns the mirror file on this phone.
///
/// There can be up to two copies, and the newest available one wins:
///  1. a downloaded copy in the app's private storage (refreshed from the web), and
///  2. the copy bundled inside the app at build time (always there, never changes).
///
/// So the app works with no network from the first launch, and quietly picks up
/// fresher data when it can.
@MainActor
final class MirrorStore {
    private(set) var snapshot: MirrorSnapshot?

    private let defaults = UserDefaults.standard
    private let etagKey = "mirror.etag"
    private let lastCheckKey = "mirror.lastCheck"
    private var isRefreshing = false

    init() {
        snapshot = Self.read(downloadedFileURL) ?? Self.read(bundledFileURL)
    }

    /// Where the downloaded copy lives: Application Support is the app's private,
    /// backed-up storage area for files the user doesn't manage directly.
    private var downloadedFileURL: URL? {
        FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent("places.json")
    }

    /// The copy shipped inside the app, if one was present when it was built.
    private var bundledFileURL: URL? {
        Bundle.main.url(forResource: "places", withExtension: "json")
    }

    private static func read(_ url: URL?) -> MirrorSnapshot? {
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        return decode(data)
    }

    /// Returns nil unless the data is a real, non-empty snapshot. This matters:
    /// if the file is missing on the server, the website answers with its HTML
    /// home page and a 200 status, which must not be mistaken for a mirror.
    private static func decode(_ data: Data) -> MirrorSnapshot? {
        guard let snapshot = try? JSONDecoder().decode(MirrorSnapshot.self, from: data),
              !snapshot.places.isEmpty else { return nil }
        return snapshot
    }

    /// Checks the web for a newer mirror, at most once per `mirrorRefreshInterval`.
    /// Every failure is silent on purpose: the copy already on the phone keeps working.
    func refreshIfStale() async {
        let lastCheck = defaults.double(forKey: lastCheckKey)
        let now = Date().timeIntervalSince1970
        guard !isRefreshing, now - lastCheck > LocatorConfig.mirrorRefreshInterval else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        var request = URLRequest(url: LocatorConfig.mirrorURL)
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData
        // An ETag is the server's fingerprint of the file. Sending back the one
        // we already have lets the server reply "304 Not Modified" with no body.
        if snapshot != nil, let etag = defaults.string(forKey: etagKey) {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse else { return }

        if http.statusCode == 304 {
            defaults.set(now, forKey: lastCheckKey)
            return
        }
        guard http.statusCode == 200, let fresh = Self.decode(data) else { return }

        snapshot = fresh
        defaults.set(now, forKey: lastCheckKey)
        defaults.set(http.value(forHTTPHeaderField: "ETag"), forKey: etagKey)
        if let url = downloadedFileURL {
            try? FileManager.default.createDirectory(
                at: url.deletingLastPathComponent(), withIntermediateDirectories: true
            )
            // .atomic writes to a temp file and renames it, so a crash mid-write
            // can never leave a half-written mirror behind.
            try? data.write(to: url, options: .atomic)
        }
    }
}
