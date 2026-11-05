import { describe, expect, it } from "vitest";
import { afterSignIn, normalizeEmail } from "./auth";
import { safeNext } from "./paths";

describe("sign-in helpers", () => {
  it("tidies and checks email addresses", () => {
    expect(normalizeEmail("  Nick@Example.COM ")).toBe("nick@example.com");
    expect(normalizeEmail("nick@example")).toBeNull();
    expect(normalizeEmail("not an email")).toBeNull();
  });

  it("sends new learners to onboarding and everyone else Home", () => {
    const user = { id: "u", email: "a@b.co", role: "learner" as const, onboarded: false };
    expect(afterSignIn(null, null)).toBe("/sign-in/expired");
    expect(afterSignIn(user, "/settings")).toBe("/onboarding");
    expect(afterSignIn({ ...user, onboarded: true }, null)).toBe("/home");
    expect(afterSignIn({ ...user, onboarded: true }, "/settings")).toBe("/settings");
    expect(afterSignIn({ ...user, role: "author" }, null)).toBe("/author");
  });

  it("only follows same-site paths after sign-in", () => {
    expect(safeNext("/lessons/1")).toBe("/lessons/1");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
