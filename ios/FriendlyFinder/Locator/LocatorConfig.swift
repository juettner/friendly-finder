import Foundation

/// Everything that makes this build "the Grain Belt Premium finder" lives here.
/// The rest of the app only knows "a product" and "a locator endpoint", so
/// pointing it at a different product is a change to this one file (plus the
/// `Pin` and `AppIcon` images in Assets.xcassets).
enum LocatorConfig {
    /// Shown in titles on the phone and the car screen.
    static let productName = "Grain Belt Premium"

    /// The existing Friendly Finder backend. Takes `?lat=..&lng=..` and returns
    /// JSON shaped like `LocatorResponse` (see Place.swift / lib/types.ts).
    static let endpoint = URL(string: "https://friendly-finder.com/api/bars")!

    /// Name of the image in Assets.xcassets used for map pins.
    static let pinAssetName = "Pin"

    /// CarPlay's Point of Interest template shows at most 12 places.
    static let maxResults = 12
}
