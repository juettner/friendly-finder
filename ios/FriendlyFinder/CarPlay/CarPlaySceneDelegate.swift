import CarPlay
import MapKit
import UIKit

/// Everything the car screen does.
///
/// CarPlay apps don't draw their own UI. You fill in one of Apple's fixed
/// "templates" with data and CarPlay renders it, so every app is safe to glance
/// at while driving. This app uses a single template, the Point of Interest
/// template: a map with pins, a list of places, and a detail card with a button.
///
/// iOS creates this class itself when a car connects; the class name is wired
/// up in Info.plist under UIApplicationSceneManifest.
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate, CPPointOfInterestTemplateDelegate {
    /// Our handle on the car screen: used to set, present, and dismiss templates.
    private var interfaceController: CPInterfaceController?
    /// The car "scene" itself. Needed to open Apple Maps ON THE CAR DISPLAY.
    private var carScene: CPTemplateApplicationScene?
    private var poiTemplate: CPPointOfInterestTemplate?

    // MARK: - Lifecycle (called by iOS)

    /// The car connected, or the driver tapped our icon.
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        self.carScene = templateApplicationScene

        // Show an empty map immediately, then fill it in when results arrive.
        let template = CPPointOfInterestTemplate(
            title: LocatorConfig.productName,
            pointsOfInterest: [],
            selectedIndex: NSNotFound
        )
        template.pointOfInterestDelegate = self
        self.poiTemplate = template
        interfaceController.setRootTemplate(template, animated: false, completion: nil)

        refresh()
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        self.interfaceController = nil
        self.carScene = nil
        self.poiTemplate = nil
    }

    // MARK: - Loading places

    private func refresh() {
        // `Task` starts async work from a non-async method, like submitting to
        // an executor. `@MainActor` keeps it on the UI thread.
        Task { @MainActor in
            do {
                let places = try await PlaceFinder.shared.findNearby()
                guard !places.isEmpty else {
                    showAlert("Nothing nearby carries \(LocatorConfig.productName).")
                    return
                }
                // Index 0 is the nearest place. Pre-selecting it means the
                // detail card with the "Go" button is already on screen:
                // tap the app icon, tap Go.
                poiTemplate?.setPointsOfInterest(places.map(makePointOfInterest), selectedIndex: 0)
            } catch LocationError.notAuthorized {
                showAlert("Open Friendly Finder on your iPhone once to allow location access.")
            } catch {
                showAlert("Couldn't load nearby places.")
            }
        }
    }

    /// Converts one of our `Place` values into CarPlay's pin + list row + detail card.
    private func makePointOfInterest(_ place: Place) -> CPPointOfInterest {
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: place.coordinate))
        mapItem.name = place.displayName

        let poi = CPPointOfInterest(
            location: mapItem,
            // List row
            title: place.displayName,
            subtitle: place.streetLine,
            summary: place.distanceText,
            // Detail card
            detailTitle: place.displayName,
            detailSubtitle: "\(place.streetLine), \(place.cityLine)",
            detailSummary: "\(place.typeText) · \(place.distanceText)",
            pinImage: pinImage(fitting: CPPointOfInterest.pinImageSize)
        )
        poi.selectedPinImage = pinImage(fitting: CPPointOfInterest.selectedPinImageSize)

        // The one button. `[weak self]` avoids a retain cycle (Swift uses
        // reference counting, not a tracing GC, so a closure that strongly
        // holds its owner would leak).
        poi.primaryButton = CPTextButton(title: "Go", textStyle: .confirm) { [weak self] _ in
            self?.openDirections(to: place)
        }
        return poi
    }

    /// Hands the destination to Apple Maps, which takes over the car screen
    /// with turn-by-turn. Opening the URL through the CAR scene (rather than
    /// UIApplication) is what makes Maps appear on the car display.
    private func openDirections(to place: Place) {
        carScene?.open(place.drivingDirectionsURL, options: nil, completionHandler: nil)
    }

    // MARK: - Pin artwork

    /// CarPlay requires pin images at exact sizes it dictates. This scales the
    /// `Pin` asset to fit inside that box, centred, keeping its proportions.
    private func pinImage(fitting box: CGSize) -> UIImage? {
        guard let source = UIImage(named: LocatorConfig.pinAssetName) else { return nil }
        let scale = min(box.width / source.size.width, box.height / source.size.height)
        let size = CGSize(width: source.size.width * scale, height: source.size.height * scale)
        let origin = CGPoint(x: (box.width - size.width) / 2, y: (box.height - size.height) / 2)
        return UIGraphicsImageRenderer(size: box).image { _ in
            source.draw(in: CGRect(origin: origin, size: size))
        }
    }

    // MARK: - Errors

    private func showAlert(_ message: String) {
        let retry = CPAlertAction(title: "Try Again", style: .default) { [weak self] _ in
            self?.interfaceController?.dismissTemplate(animated: true, completion: nil)
            self?.refresh()
        }
        let alert = CPAlertTemplate(titleVariants: [message], actions: [retry])
        interfaceController?.presentTemplate(alert, animated: true, completion: nil)
    }

    // MARK: - CPPointOfInterestTemplateDelegate

    /// Called when the driver pans or zooms the map. Required by the protocol.
    /// Left empty on purpose: the goal is "nearest to me", not "search this area".
    func pointOfInterestTemplate(
        _ pointOfInterestTemplate: CPPointOfInterestTemplate,
        didChangeMapRegion region: MKCoordinateRegion
    ) {}
}
