declare module 'clipper-lib' {
  export interface IntPoint {
    X: number;
    Y: number;
    Z?: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];

  export interface PolyNode {
    IsHole(): boolean;
    IsOpen(): boolean;
    Contour(): Path;
    Childs(): PolyNode[];
  }

  export interface PolyTree extends PolyNode {
    Clear(): void;
  }

  export interface ExPolygon {
    outer: Path;
    holes: Path[];
  }

  export interface ClipperInstance {
    AddPath(path: Path, polyType: number, closed: boolean): boolean;
    AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
    Execute(clipType: number, solution: Paths | PolyTree, subjFillType?: number, clipFillType?: number): boolean;
    Clear(): void;
  }

  export interface OffsetInstance {
    AddPath(path: Path, joinType: number, endType: number): void;
    AddPaths(paths: Paths, joinType: number, endType: number): void;
    Execute(solution: Paths, delta: number): void;
    Clear(): void;
    MiterLimit: number;
    ArcTolerance: number;
  }

  const ClipperLib: {
    version: string;
    use_lines: boolean;
    use_xyz: boolean;
    Clipper: { new (initOptions?: number): ClipperInstance };
    ClipperOffset: { new (miterLimit?: number, arcTolerance?: number): OffsetInstance };
    ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
    PolyType: { ptSubject: number; ptClip: number };
    PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: { etOpenSquare: number; etOpenRound: number; etOpenButt: number; etClosedLine: number; etClosedPolygon: number };
    PolyTree: { new (): PolyTree };
    Paths: { new (): Paths };
    IntPoint: { new (x?: number, y?: number): IntPoint };
    JS: {
      PolyTreeToExPolygons(tree: PolyTree): ExPolygon[];
      ExPolygonsToPaths(exps: ExPolygon[]): Paths;
    };
  };

  export default ClipperLib;
}
