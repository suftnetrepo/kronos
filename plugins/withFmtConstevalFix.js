const { withPodfile } = require('@expo/config-plugins');

// Newer Apple Clang (this project builds with Xcode 26.4, __apple_build_version__
// 21000099) reports full C++20 `consteval` support, so fmt (bundled transitively
// via RCT-Folly/React Native) turns on FMT_USE_CONSTEVAL and its compile-time
// FMT_STRING() format-string validation — which then hard-fails to compile with:
//   "Call to consteval function 'fmt::basic_format_string<...>' is not a
//    constant expression"
// fmt's own version gate (`__apple_build_version__ < 14000029L`) predates this
// Xcode entirely, so it doesn't catch the regression. A compiler `-D` define
// doesn't survive it either — fmt's header (un)conditionally re-`#define`s
// FMT_USE_CONSTEVAL itself with no `#ifndef` guard, so it clobbers anything
// passed on the command line. The only thing that reliably wins is patching
// the header text after CocoaPods installs it, forcing FMT_USE_CONSTEVAL to 0
// right before it's consumed.
//
// `ios/` (and so `ios/Pods/`) is regenerated from scratch by `expo prebuild`,
// so this patch is applied as a plugin instead of a one-off pod edit — it
// re-runs on every `pod install`.
const MARKER = "# fmt consteval fix (withFmtConstevalFix)";

function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }

    const anchor = "  end\nend";
    const lastIndex = contents.lastIndexOf(anchor);
    if (lastIndex === -1) {
      throw new Error(
        "withFmtConstevalFix: couldn't find the Podfile's closing `end`s to patch — Podfile structure may have changed.",
      );
    }

    const patch = `
    ${MARKER}
    fmt_base_h = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      contents = File.read(fmt_base_h)
      needle = "#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval"
      override = "#undef FMT_USE_CONSTEVAL\\n#define FMT_USE_CONSTEVAL 0\\n" + needle
      unless contents.include?('#undef FMT_USE_CONSTEVAL')
        File.write(fmt_base_h, contents.sub(needle, override))
      end
    end
${anchor}`;

    config.modResults.contents =
      contents.slice(0, lastIndex) + patch + contents.slice(lastIndex + anchor.length);

    return config;
  });
}

module.exports = withFmtConstevalFix;
