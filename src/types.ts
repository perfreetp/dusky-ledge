// 全局数据模型 —— 世界坐标统一使用毫米，y 轴向上（数学坐标系）

export interface Vec2 {
  x: number
  y: number
}

/** 线段类型：直线 / 三次贝塞尔 / 圆弧（DXF bulge 表示法） */
export interface Segment {
  type: 'line' | 'cubic' | 'arc'
  /** 弧段终点；line 的端点 */
  e: Vec2
  /** cubic 控制点1 */
  c1?: Vec2
  /** cubic 控制点2 */
  c2?: Vec2
  /** arc 专用：bulge = tan(θ/4)，正=逆时针，负=顺时针 */
  bulge?: number
}

/** 一条闭合/开放子轮廓，节点之间由 Segment 连接，末节点回到 contours[0] 由 closed 决定 */
export interface Contour {
  points: Vec2[]
  segments: Segment[] // 长度与 points 相同，segments[i].e === points[(i+1)%n]（闭合时）
  closed: boolean
}

export interface PathShape {
  id: string
  name: string
  layerId: string
  color: string
  contours: Contour[]
  /** 布尔运算来源记录，便于追溯 */
  booleanOrigin?: { op: BooleanOp; sources: string[]; version: string }
  createdAt: number
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  color: string
}

export interface Doc {
  projectNo: string
  equipmentNo: string
  equipmentName: string
  gridSize: number
  layers: Layer[]
  shapes: PathShape[]
}

export type BooleanOp = 'union' | 'intersect' | 'subtract'

export type AnnotationStatus = 'open' | 'replied' | 'resolved'

export interface Annotation {
  id: string
  /** 画布上的批注打点（世界坐标，毫米） */
  point: Vec2
  text: string
  author: string
  createdAt: number
  replies: { id: string; author: string; text: string; createdAt: number }[]
  status: AnnotationStatus
}

export interface VersionRecord {
  id: string
  projectNo: string
  equipmentNo: string
  equipmentName: string
  version: string
  doc: Doc
  submitter: string
  note: string
  createdAt: number
  annotations: Annotation[]
}

export type ToolId =
  | 'select'
  | 'pan'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'polygon'
  | 'bezier'

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type DistributeMode = 'hgap' | 'vgap'
