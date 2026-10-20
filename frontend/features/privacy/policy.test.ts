import { describe, expect, it } from "vitest";
import { consentTypeForPreferences, privacyPolicySections } from "@/features/privacy/policy";

describe("privacy policy", () => {
  it("includes each required policy section", () => {
    expect(privacyPolicySections.map((section) => section.id)).toEqual(expect.arrayContaining([
      "controller",
      "collection",
      "purposes",
      "processors",
      "location",
      "ai",
      "rights",
      "retention",
      "security"
    ]));
  });

  it("classifies the explicit cookie preference combinations", () => {
    expect(consentTypeForPreferences({ analytics: true, geolocation: true })).toBe("ALL");
    expect(consentTypeForPreferences({ analytics: false, geolocation: false })).toBe("NECESSARY_ONLY");
    expect(consentTypeForPreferences({ analytics: true, geolocation: false })).toBe("CUSTOM");
    expect(consentTypeForPreferences({ analytics: false, geolocation: true })).toBe("CUSTOM");
  });
});
