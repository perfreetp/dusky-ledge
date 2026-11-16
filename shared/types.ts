export interface Pt {
  x: number;
  y: number;
}

export type FeatureKind =
  | 'main-channel'
  | 'walkway'
  | 'fire-lane'
  | 'no-park'
  | 'station'
  | 'material'
  | 'hazard';

export type GeomType = 'path' | 'area';

export type StrokeStyleType = 'solid' | 'dashed' | 'dotted';

export type HatchType = 'diagonal' | 'cross' | 'grid' | 'dots';

export interface HatchStyle {
  type: HatchType;
  /** mm between stripes */
  spacing: number;
  /** stripe angle in degrees, screen/world space (y down) */
  angle: number;
  /** stripe line width in mm */
  lineWidth: number;
  color: string;
  /** optional second color, alternated stripe by stripe (yellow/black hazard) */
  color2?: string;
  alpha: number;
}

export interface FeatureStyle {
  lineWidth: number;
  outlineWidth: number;
  strokeColor: string;
  fillColor: string | null;
  fillOpacity: number;
  strokeStyle: StrokeStyleType;
  hatch: HatchStyle | null;
}

export interface Feature extends FeatureStyle {
  id: string;
  kind: FeatureKind;
  name: string;
  geom: GeomType;
  /** open centerline polylines, used when geom === 'path' */
  paths: Pt[][];
  /** closed rings (outer + holes, even-odd), used when geom === 'area' */
  rings: Pt[][];
  centerLine?: boolean;
  visible: boolean;
  locked: boolean;
  meta?: Record<string, unknown>;
}

export interface BackgroundImage {
  assetId: string | null;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
}

export interface GridSettings {
  minor: number;
  major: number;
  show: boolean;
  snapGrid: boolean;
  snapEndpoints: boolean;
  snapMidpoints: boolean;
  snapSegments: boolean;
}

export interface DocSettings {
  grid: GridSettings;
  /** show mm dimensions on selected feature */
  showDimensions: boolean;
}

export interface PlanDoc {
  schema: 1;
  name: string;
  workshopId: string | null;
  width: number;
  height: number;
  background: BackgroundImage | null;
  features: Feature[];
  settings: DocSettings;
}

export interface Workshop {
  id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface PlanRecord {
  id: string;
  workshopId: string | null;
  name: string;
  doc: PlanDoc;
  createdAt: string;
  updatedAt: string;
}

export interface VersionRecord {
  id: string;
  planId: string;
  name: string;
  note: string;
  author: string;
  doc: PlanDoc;
  createdAt: string;
}

export interface TrainingRequirements {
  /** allowed/required feature kinds and their expected widths (mm) */
  expected: Partial<Record<FeatureKind, { width: number; count: number; required: boolean }>>;
  /** tolerance for position matching, mm */
  positionTolerance: number;
  /** fractional width tolerance for full credit, e.g. .1 = ±10% */
  widthTolerance: number;
  /** scoring weights 0..1, normalized */
  weights: { coverage: number; width: number; closure: number };
  notes: string;
}

export interface TrainingTask {
  id: string;
  title: string;
  description: string;
  workshopId: string | null;
  baseDoc: PlanDoc;
  referenceDoc: PlanDoc | null;
  requirements: TrainingRequirements;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  deadline: string | null;
}

export type GradeItemType = 'missing' | 'extra' | 'width' | 'closure' | 'position' | 'style';

export interface GradeItem {
  id: string;
  type: GradeItemType;
  title: string;
  detail: string;
  refFeatureId?: string;
  studentFeatureId?: string;
  expected?: string;
  actual?: string;
  deduction: number;
  canOverride?: boolean;
}

export interface GradeResult {
  score: number;
  coverageScore: number;
  widthScore: number;
  closureScore: number;
  penalty: number;
  items: GradeItem[];
  matched: { refId: string; studentId: string; coverage: number; widthRatio: number }[];
  featureCount: { reference: number; student: number };
  generatedAt: string;
}

export interface TeacherReview {
  finalScore: number | null;
  remark: string;
  adjustedItems: { id: string; deduction: number; comment: string }[];
  reviewer: string;
  reviewedAt: string | null;
}

export interface Submission {
  id: string;
  taskId: string;
  studentName: string;
  doc: PlanDoc;
  autoGrade: GradeResult | null;
  review: TeacherReview | null;
  status: 'draft' | 'submitted' | 'reviewed';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  role: 'ehs' | 'teacher' | 'student';
}
