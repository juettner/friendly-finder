import Foundation

/// Everything that makes this build "the Grain Belt Premium finder" lives here.
/// The rest of the app only knows "a product" and "a locator endpoint", so
/// pointing it at a different product is a change to this one file (plus the
/// `Pin` and `AppIcon` images in Assets.xcassets).
enum LocatorConfig {
    /// Shown in titles on the phone and the car screen.
    static let productName = "Grain Belt Premium"

    /// The live API, used outside the mirrored regions. Takes `?lat=..&lng=..` and returns
    /// JSON shaped like `LocatorResponse` (see Place.swift / lib/types.ts).
    static let endpoint = URL(string: "https://friendly-finder.com/api/bars")!

    /// The mirror file written by the weekly job (see lambda/mirror.ts).
    static let mirrorURL = URL(string: "https://friendly-finder.com/data/places.json")!

    /// How often the app checks the web for a newer mirror: once a day.
    static let mirrorRefreshInterval: TimeInterval = 24 * 60 * 60

    /// When the live API can't be reached, mirrored results are only shown if
    /// the closest one is within this many miles.
    static let offlineFallbackMiles = 25.0

    /// Short call to action on the phone screen's main button.
    static let findButtonTitle = "Find the nearest Premium"

    /// Name of the image in Assets.xcassets used as the header on the phone screen.
    static let logoAssetName = "Logo"

    /// Name of the image in Assets.xcassets used for map pins.
    static let pinAssetName = "Pin"

    /// CarPlay's Point of Interest template shows at most 12 places.
    static let maxResults = 12
}
