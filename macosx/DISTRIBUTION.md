# Castle macOS Distribution

This is a document about how we distribute Castle for macOS.

## Overview

We use Apple's `Developer ID` program to distribute our macOS binary without using the mac app store. This means that Apple has verified our identity as a corporation and we paid them 99 bucks.

We use CircleCI to build, codesign, and notarize the app. If all of those things succeed, we upload the app to a release repository and use Sparkle to broadcast updates to existing copies.

**Desired behavior:** When people open `Castle.app` for the first time, they should see a message like `"Castle.app" is an application downloaded from the internet. Are you sure you want to open it?` along with an `Open` button. This means the app was signed successfully, Apple recognizes who we are, and is allowing the user to open the app.

**Bad behavior:** If codesigning or notarization failed, first-time users of Castle will see some other message like `"Castle.app" can't be opened because it was created by an unidentified developer.` and there will be no `Open` button. Users will need to right-click the app and open it that way. There are also some other errors that can appear here. In general, anything without an `Open` button is bad.

## Relevant code

- CircleCI config lives in [../.circleci/config.yml](../.circleci/config.yml).
- The main script controlling the release pipeline is [release.sh](release.sh).
- The [tools](./tools) directory contains scripts in charge of codesigning and notarization.

## How we codesign in CI

- We got a Developer ID certificate from Apple. These take several years to expire, so this is just a file that won't change for awhile.
- Our release script runs [codesign-archive.sh](tools/codesign-archive.sh) on the macOS archive it created.
- This script clones a private repo containing a copy of our Developer ID certificate, adds our cert to a temporary keychain on the machine, then codesigns the archive with that certificate.
- Finally, the release script runs [verify-gatekeeper.sh](tools/verify-gatekeeper.sh) to check that the app was actually codesigned correctly. The checks we run are derived from Apple's [Gatekeeper Conformance doc](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html#//apple_ref/doc/uid/TP40005929-CH4-TNTAG211). If any of the checks fails, the app will not be released.

## How we notarize in CI

Starting with macOS Catalina, Developer ID apps are required to be "notarized", which means we upload the binary to an automated Apple service which checks that we don't break any of Apple's rules, wait for the service to finish, then attach a document proving that we did all this. [notarize-archive.sh](tools/notarize-archive.sh) is responsible for that.

## Do we codesign locally?

No. Since this is a macOS app, developers building Castle from source can run Castle on their machines without any codesigning. So most people on the team never need to get a copy of our certificate or run any of the codesigning scripts.

## Caveats

Right now our app does not conform to Apple's newer concept of "runtime hardening". We will need to implement this change before January 2020.

## Why not use fastlane?

At some point it will probably make sense to switch over to using fastlane for this. However, at the time of writing, fastlane didn't make sense because:

- It didn't have support for these oddball `Developer ID` certs, which only apply to people distributing mac apps outside the mac app store.
- `fastlane match` is good for sharing certs among many people when the cert is changing often. This is often true for iOS projects. In our case, the cert "never" changes (once every several years) and the only entity that needs the cert is CI. So the utility of integrating `fastlane match` was low.

If fastlane adds first class support for our usecase then I imagine we'll switch over.

## How to debug issues when the app doesn't open on your machine

If the app won't open for you (see "bad behavior" above), it's possible something went wrong with codesigning or notarization. You can test those things by following these instructions:

### Clear any existing gatekeeper state on your local machine

If you previously override Gatekeeper's rules for any instance of Castle, you'll want to clear out those exceptions so that your machine acts like it's never seen Castle before:

```
sudo spctl --list | grep Castle
```

If the output of that command was empty, you're good to go. If any "rules" appeared here with unique numbers, remove them:

```
spctl --remove --rule <rule number>
```

### Verify the app locally

You can run [verify-gatekeeper.sh](tools/verify-gatekeeper.sh) locally on any `.app`. You can also run individual commands from that script to see more verbose output.

Team members can also run our codesigning script locally. Clone our private certificate repository, then provide the path to the certificate as an argument to the codesigning script. You do not need to manually add the cert to your keychain.

```
./tools/codesign-archive.sh some-archive.xcarchive ../path/to/macos/CastleDeveloperID.p12
```

Where `some-archive.xcarchive` was created with `xcodebuild` or by our release script.

### Check the notarization log in CI

Every time we notarize our app, Apple generates a verbose log of various issues it encountered while notarizing the app. We attach this to the build as an artifact called `notarize-log.txt`. Check this log and consult [Apple's Notarization Guide](https://developer.apple.com/documentation/xcode/notarizing_your_app_before_distribution/resolving_common_notarization_issues) for possible issues.

Another thing that can happen: If you see something like this in the log, it means you need to sign in to the Apple developer account and agree to some terms or contract or something.

```
You must first sign the relevant contracts online. (1048)
```

### Possible issues

- Anything about "already signed" or "unsealed" is likely to be an issue with one of Castle's supporting Frameworks. We have several (SDL, Love, Lua, etc.). As of macOS Mavericks, Frameworks needs to conform to a really specific file format. You can run [update-framework.sh](tools/update-framework.sh) on an older framework to convert it to a valid format.
- Anything about "identity could not be verified" means some other aspect of Gatekeeper failed that we weren't able to check automatically. One example is that the app cannot reference any `@rpath` outside of the app's bundle ([docs](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html#//apple_ref/doc/uid/TP40005929-CH4-TNTAG211)). To inspect this, open `Console.app`, then read the logs while trying to open `Castle.app` and look for errors about `failed on rPathCmd`.
- If you see "Apple cannot check it for malicious software", this indicates that Notarization failed. See previous mention of notarization.