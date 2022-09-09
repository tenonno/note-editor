import { clamp } from "lodash";
import { gcd } from "mathjs";
import Vector2 from "./math/Vector2";

export interface IFraction {
  numerator: number;
  denominator: number;
}

export class Fraction {
  constructor(public numerator: number, public denominator: number) {}

  static to01(fraction: IFraction) {
    return (1 / fraction.denominator) * fraction.numerator;
  }

  static clone(fraction: IFraction) {
    return { numerator: fraction.numerator, denominator: fraction.denominator };
  }

  static add(a: IFraction, b: IFraction) {
    const fraction = {
      numerator: a.numerator * b.denominator + b.numerator * a.denominator,
      denominator: a.denominator * b.denominator,
    };
    this.reduceDestructive(fraction);
    return fraction;
  }

  static mul(a: IFraction, b: IFraction) {
    const fraction = {
      numerator: a.numerator * b.numerator,
      denominator: a.denominator * b.denominator,
    };
    this.reduceDestructive(fraction);
    return fraction;
  }

  static div(a: IFraction, b: IFraction) {
    return Fraction.mul(a, {
      numerator: b.denominator,
      denominator: b.numerator,
    });
  }

  // 約分
  public static reduceDestructive(fraction: IFraction): void {
    const div = gcd(fraction.numerator, fraction.denominator);
    fraction.numerator /= div;
    fraction.denominator /= div;
  }

  public static reduce(fraction: IFraction): IFraction {
    const cloned = this.clone(fraction);
    this.reduceDestructive(cloned);
    return cloned;
  }

  public static withNumerator(fraction: IFraction, numerator: number) {
    const cloned = this.clone(fraction);
    cloned.numerator = numerator;
    return cloned;
  }

  static equal(a: IFraction, b: IFraction) {
    if (a.denominator === 0 || b.denominator === 0) return false;
    return a.numerator * b.denominator === b.numerator * a.denominator;
  }

  static none = new Fraction(0, 0);
}

export { default as Vector2 } from "./math/Vector2";

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

export const inverseLerp = (from: number, to: number, value: number) =>
  (value - from) / (to - from);

/**
 * 数値を検査して正常な値にする
 * @param value 値
 * @param min 最小値
 * @param max 最大値
 */
export function verifyNumber(value: number, min = -Infinity, max = Infinity) {
  return clamp(Number.isFinite(value) ? value : 0, min, max);
}

export function approximately(v1: number, v2: number, epsilon = 0.001) {
  return Math.abs(v1 - v2) < epsilon;
}

export function isInSquare(
  pa: Vector2,
  pb: Vector2,
  pc: Vector2,
  pd: Vector2,
  p: Vector2
) {
  const a = calcExteriorProduct(pa, pb, p);

  if (a <= 0) return false;

  const b = calcExteriorProduct(pb, pc, p);

  if (b <= 0) return false;

  const c = calcExteriorProduct(pc, pd, p);

  if (c <= 0) return false;

  const d = calcExteriorProduct(pd, pa, p);

  return d > 0;
}

function calcExteriorProduct(a: Vector2, b: Vector2, p: Vector2) {
  const ab = new Vector2(a.x - b.x, a.y - b.y);
  const pa = new Vector2(a.x - p.x, a.y - p.y);
  return ab.x * pa.y - pa.x * ab.y;
}
