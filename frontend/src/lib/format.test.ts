import { describe, expect, it } from "vitest";
import { bhkLabel, formatArea, formatDistance, formatINR, formatINRCompact, initials } from "./format";

describe("formatINR", () => {
  it("uses the rupee symbol and Indian digit grouping", () => {
    expect(formatINR(25000)).toBe("₹25,000");
    expect(formatINR(1000000)).toBe("₹10,00,000");
    expect(formatINR(0)).toBe("₹0");
  });
});

describe("formatINRCompact", () => {
  it.each([
    [950, "₹950"],
    [25000, "₹25K"],
    [12500, "₹12.5K"],
    [120000, "₹1.2L"],
    [100000, "₹1L"],
    [35000000, "₹3.5Cr"],
  ])("formats %d as %s", (amount, expected) => {
    expect(formatINRCompact(amount)).toBe(expected);
  });
});

describe("bhkLabel", () => {
  it("labels 0 as 1 RK, or Studio for studio properties", () => {
    expect(bhkLabel(0)).toBe("1 RK");
    expect(bhkLabel(0, "APARTMENT")).toBe("1 RK");
    expect(bhkLabel(0, "STUDIO")).toBe("Studio");
  });
  it("labels other counts as BHK", () => {
    expect(bhkLabel(2)).toBe("2 BHK");
  });
});

describe("misc formatters", () => {
  it("formats area, distance and initials", () => {
    expect(formatArea(1250)).toBe("1,250 sq.ft");
    expect(formatDistance(0.45)).toBe("450 m away");
    expect(formatDistance(2.34)).toBe("2.3 km away");
    expect(initials("Asha  Rao Kumar")).toBe("AR");
  });
});
