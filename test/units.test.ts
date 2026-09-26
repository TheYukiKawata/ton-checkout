import { describe, expect, test } from "bun:test";
import { formatUnits, parseUnits } from "../src/units.ts";

describe("parseUnits", () => {
  test("scales decimals to smallest units", () => {
    expect(parseUnits("25", 9)).toBe(25_000_000_000n);
    expect(parseUnits("0.5", 6)).toBe(500_000n);
    expect(parseUnits(" 1.000001 ", 6)).toBe(1_000_001n);
  });

  test("rejects more decimal places than the asset has", () => {
    expect(() => parseUnits("0.0000001", 6)).toThrow();
  });

  test("rejects values that are not positive decimals", () => {
    for (const value of ["", "-1", "1e9", "1,5", "abc", ".5"]) expect(() => parseUnits(value, 9)).toThrow();
  });
});

describe("formatUnits", () => {
  test("drops trailing zeros", () => {
    expect(formatUnits(25_000_000_000n, 9)).toBe("25");
    expect(formatUnits(500_000n, 6)).toBe("0.5");
    expect(formatUnits(1n, 9)).toBe("0.000000001");
    expect(formatUnits(7n, 0)).toBe("7");
  });

  test("reverses parseUnits", () => {
    for (const value of ["0.1", "12.345678", "1000"]) expect(formatUnits(parseUnits(value, 6), 6)).toBe(value);
  });
});
