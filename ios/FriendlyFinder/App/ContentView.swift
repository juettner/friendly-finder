import SwiftUI

/// The phone screen. It exists for two reasons:
///  1. iOS will only show the "Allow location?" prompt on the phone, never on
///     the car display, so permission has to be granted here once.
///  2. It is a quick way to check the locator works without a car attached.
///
/// SwiftUI is declarative, like React: `body` describes what the screen looks
/// like for the current state, and SwiftUI re-runs it whenever a `@State`
/// property changes. You never mutate views directly.
struct ContentView: View {
    @State private var places: [Place] = []
    @State private var message: String?
    @State private var isLoading = false
    @Environment(\.openURL) private var openURL

    private let finder = PlaceFinder.shared

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        Task { await find() }
                    } label: {
                        Label("Find the nearest", systemImage: "location.fill")
                    }
                    .disabled(isLoading)

                    if isLoading { ProgressView() }
                    if let message { Text(message).foregroundStyle(.secondary) }
                }

                Section("Nearest first") {
                    ForEach(places) { place in
                        Button {
                            openURL(place.drivingDirectionsURL)
                        } label: {
                            HStack {
                                Image(LocatorConfig.pinAssetName)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 44)
                                VStack(alignment: .leading) {
                                    Text(place.displayName).font(.headline)
                                    Text(place.streetLine).font(.subheadline).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(place.distanceText).monospacedDigit()
                            }
                        }
                        .tint(.primary)
                    }
                }
            }
            .navigationTitle(LocatorConfig.productName)
        }
    }

    private func find() async {
        // First run: ask for permission and stop. The user taps again once
        // they've answered the system prompt.
        if finder.location.canAskForPermission {
            finder.location.requestPermission()
            message = "Allow location access, then tap again."
            return
        }

        isLoading = true
        defer { isLoading = false }
        do {
            places = try await finder.findNearby()
            message = places.isEmpty ? "Nothing nearby." : nil
        } catch LocationError.notAuthorized {
            message = "Location is turned off for this app. Enable it in Settings > Privacy & Security > Location Services."
        } catch {
            message = error.localizedDescription
        }
    }
}
