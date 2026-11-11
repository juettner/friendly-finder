import SwiftUI

/// The phone screen. It exists for two reasons:
///  1. iOS will only show the "Allow location?" prompt on the phone, never on
///     the car display, so permission has to be granted here once.
///  2. It is a quick way to use the finder without a car attached.
///
/// SwiftUI is declarative, like React: `body` describes what the screen looks
/// like for the current state, and SwiftUI re-runs it whenever a `@State`
/// property changes. You never mutate views directly.
///
/// Layout, top to bottom: logo, big red button, the nearest place as a
/// featured card, then the rest as a compact list.
struct ContentView: View {
    @State private var places: [Place] = []
    @State private var message: String?
    @State private var isLoading = false
    @Environment(\.openURL) private var openURL

    private let finder = PlaceFinder.shared

    var body: some View {
        ScrollView {
            // VStack = a vertical flexbox column.
            VStack(spacing: 22) {
                Image(LocatorConfig.logoAssetName)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 250)
                    .padding(.top, 28)
                    .accessibilityLabel(LocatorConfig.productName)

                Button {
                    Task { await find() }
                } label: {
                    HStack(spacing: 10) {
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "location.fill")
                        }
                        Text(LocatorConfig.findButtonTitle)
                    }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(isLoading)

                if let message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(Theme.ink.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                if let nearest = places.first {
                    NearestCard(place: nearest) { openURL(nearest.drivingDirectionsURL) }
                }

                if places.count > 1 {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("ALSO NEARBY")
                            .font(.caption.weight(.bold))
                            .tracking(1.5)
                            .foregroundStyle(Theme.red)
                            .padding(.bottom, 6)

                        // dropFirst() skips the nearest place, already shown above.
                        ForEach(Array(places.dropFirst())) { place in
                            Button {
                                openURL(place.drivingDirectionsURL)
                            } label: {
                                PlaceRow(place: place)
                            }
                            .buttonStyle(.plain)

                            if place.id != places.last?.id { Divider() }
                        }
                    }
                    .card()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Theme.cream.ignoresSafeArea())
        // The brand is red on cream, so keep the light look even in Dark Mode.
        .preferredColorScheme(.light)
        // Runs once when the screen appears: if location was already allowed
        // on a previous launch, load results straight away.
        .task {
            if finder.location.isAuthorized { await find() }
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

/// The featured card for the closest place, with its own directions button.
private struct NearestCard: View {
    let place: Place
    let onDirections: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("NEAREST")
                    .font(.caption.weight(.bold))
                    .tracking(1.5)
                    .foregroundStyle(Theme.red)
                Spacer()
                TypeBadge(text: place.typeText)
            }

            Text(place.displayName)
                .font(.system(.title2, design: .serif).weight(.bold))
                .foregroundStyle(Theme.ink)

            VStack(alignment: .leading, spacing: 2) {
                Text(place.streetLine)
                Text(place.cityLine)
            }
            .font(.subheadline)
            .foregroundStyle(Theme.ink.opacity(0.7))

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(String(format: "%.1f", place.distanceMiles))
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.red)
                Text("miles away")
                    .font(.subheadline)
                    .foregroundStyle(Theme.ink.opacity(0.7))
            }

            Button(action: onDirections) {
                Label("Get Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
            }
            .buttonStyle(BrandButtonStyle())
        }
        .card()
    }
}

/// One compact row in the "also nearby" list.
private struct PlaceRow: View {
    let place: Place

    var body: some View {
        HStack(spacing: 12) {
            Image(LocatorConfig.pinAssetName)
                .resizable()
                .scaledToFit()
                .frame(width: 46)

            VStack(alignment: .leading, spacing: 2) {
                Text(place.displayName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text(place.streetLine)
                    .font(.caption)
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }

            Spacer()

            Text(place.distanceText)
                .font(.subheadline.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(Theme.red)
        }
        .padding(.vertical, 10)
        // Makes the whole row tappable, not just the text and image.
        .contentShape(Rectangle())
    }
}

/// Small "Bar" / "Store" pill.
private struct TypeBadge: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(1)
            .foregroundStyle(Theme.red)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Theme.red.opacity(0.1), in: Capsule())
    }
}
