import { lcm } from "mathjs";
import { Fraction, IFraction } from "../math";
import { MeasureObject } from "../objects/Measure";

export class MeasureObjectGroup<T extends MeasureObject> {
  public readonly tickMap = new Map<T, number>();
  public readonly lcmDenominator: number;

  public get minTick() {
    return Math.min(...this.tickMap.values());
  }

  public get maxTick() {
    return Math.max(...this.tickMap.values());
  }

  public constructor(
    notes: T[],
    additionalObjects: { measurePosition: IFraction }[] = []
  ) {
    // 全てのノーツの denominator の最小公倍数
    this.lcmDenominator = [...notes, ...additionalObjects]
      .map((note) => note.measurePosition.denominator)
      .reduce((a, b) => lcm(a, b), 1);

    console.log(this.lcmDenominator);

    for (const note of notes) {
      const { numerator, denominator } = note.measurePosition;

      const magnification = this.lcmDenominator / denominator;

      note.measurePosition = new Fraction(
        numerator * magnification,
        this.lcmDenominator
      );

      const tick =
        note.measureIndex * this.lcmDenominator + numerator * magnification;

      this.tickMap.set(note, tick);
    }
  }

  private tickToPosition(tick: number) {
    const { lcmDenominator } = this;
    const measureI = Math.floor(tick / lcmDenominator);
    const measureT = tick % lcmDenominator;

    return {
      measureIndex: measureI,
      measurePosition: Fraction.reduce(new Fraction(measureT, lcmDenominator)),
    };
  }

  public moveTo(
    measureIndex: number,
    measurePosition: IFraction,
    callback: (
      note: T,
      measureIndex: number,
      measurePosition: IFraction
    ) => void
  ) {
    const { numerator, denominator } = measurePosition;
    const magnification = this.lcmDenominator / denominator;

    const addTick =
      measureIndex * this.lcmDenominator +
      numerator * magnification -
      this.minTick;

    for (const [note, tick] of this.tickMap) {
      const position = this.tickToPosition(tick + addTick);

      callback(note, position.measureIndex, position.measurePosition);
    }
  }
}
