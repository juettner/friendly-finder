# Friendly Finder for CarPlay

A small native iOS app that puts the Friendly Finder on a CarPlay head unit:
tap the icon, see the nearest place carrying the product, tap **Go**, and Apple
Maps takes over with driving directions.

It reuses the existing backend (`https://friendly-finder.com/api/bars`); there
is no new server code.

## Status

This was written on Linux and has **not been compiled yet**. Expect to fix a
handful of compiler errors on the first build in Xcode.

## What you need

- A Mac with Xcode 16 or newer
- [XcodeGen](https://github.com/yonaskolb/XcodeGen), which generates the Xcode
  project from `project.yml`
- For a real head unit: a paid Apple Developer account with the CarPlay
  **Driving Task** entitlement granted by Apple

## Build and run in the simulator

```bash
brew install xcodegen
```

```bash
cd ios && xcodegen generate && open FriendlyFinder.xcodeproj
```

1. In Xcode, select the **FriendlyFinder** target, open **Signing &
   Capabilities**, and pick your team.
2. Choose an iPhone simulator and press Run (⌘R).
3. On the simulated phone, tap **Find the nearest** and allow location access.
   This has to happen on the phone once; iOS never shows permission prompts on
   the car screen.
4. In the Simulator menu choose **I/O > External Displays > CarPlay**. The app
   icon appears on the CarPlay home screen.
5. Give the simulator a location with **Features > Location > Custom Location**
   (for example 44.98, -93.265 for downtown Minneapolis).

Re-run `xcodegen generate` whenever you add, rename, or delete a file.

## Run on the truck

Once Apple grants the entitlement, Xcode's automatic signing picks it up. Plug
the iPhone into the Mac, select it as the run destination, press Run, then
connect the phone to the head unit.

## Layout

```
project.yml                   XcodeGen definition (the "pom.xml")
FriendlyFinder/
  Info.plist                  app metadata + the CarPlay scene wiring
  FriendlyFinder.entitlements the CarPlay Driving Task entitlement
  App/                        the phone screen (SwiftUI)
  CarPlay/                    the car screen (CarPlay templates)
  Locator/                    location, HTTP client, data model, config
  Assets.xcassets/            app icon and map pin artwork
```

To point the app at a different product, edit `Locator/LocatorConfig.swift`
and replace the `Pin` and `AppIcon` images.
