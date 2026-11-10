import SwiftUI

/// Entry point (`@main` is the `public static void main`). This declares the
/// PHONE screen only. The car screen is created separately by iOS from the
/// scene manifest in Info.plist, and lands in CarPlay/CarPlaySceneDelegate.swift.
@main
struct FriendlyFinderApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
