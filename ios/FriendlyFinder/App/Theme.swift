import SwiftUI

/// The app's look in one place. Colours are defined in Assets.xcassets (as
/// "colour sets") and referenced by name here, so a rebrand is an asset change,
/// not a code change. Think of this file as the shared CSS variables.
enum Theme {
    static let red = Color("BrandRed")
    static let cream = Color("BrandCream")
    static let ink = Color(red: 0.13, green: 0.11, blue: 0.11) // near-black for body text
    static let card = Color.white

    static let cornerRadius: CGFloat = 18
}

/// The big red pill button. A `ButtonStyle` is SwiftUI's version of a reusable
/// CSS class for buttons: it receives the button's label and decides how to
/// draw it, including the pressed state.
struct BrandButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.red, in: Capsule())
            .opacity(configuration.isPressed || !isEnabled ? 0.6 : 1)
    }
}

/// A white rounded card with a soft shadow. A `ViewModifier` wraps any view in
/// extra styling; `.card()` below is the convenient way to apply it.
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .shadow(color: .black.opacity(0.08), radius: 10, y: 4)
    }
}

extension View {
    func card() -> some View { modifier(CardModifier()) }
}
