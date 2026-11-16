/** 全局领域类型：前端、后端、几何内核共用 */
export type Vec3 = [number, number, number];
export type InterpolationType = 'linear' | 'catmullRom' | 'bezier' | 'nurbs';
export type UserRole = 'engineer' | 'supervisor' | 'admin';
export type ReviewStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type LayerType = 'inner' | 'outer';
/** 样条控制点。weight 在 NURBS 模式下为 NURBS 权，其它模式下为张力系数 */
export interface ControlPoint {
    id: string;
    position: Vec3;
    weight: number;
    /** 关联的机器人关节 id（J0..J6，J0=基座，J6=工具端） */
    jointId: string;
    note?: string;
}
/** 项目规则配置（曲率、间隙、命名模板等） */
export interface ProjectRules {
    /** 线缆/护套外径 (mm) */
    outerDiameter: number;
    /** 壁厚 (mm) */
    wallThickness: number;
    /** 最小允许弯曲半径 = bendRadiusFactor × 外径 */
    bendRadiusFactor: number;
    /** 内外两层间最小允许间隙 (mm) */
    minLayerGap: number;
    /** 命名模板，占位符：{project} {seq} {joint} */
    segmentNameTemplate: string;
    /** 管 mesh 环向分段数 */
    radialSegments: number;
    /** 管 mesh 纵向采样数 */
    tubularSegments: number;
}
export declare const DEFAULT_PROJECT_RULES: ProjectRules;
/** 可序列化的护套模型（版本快照里存的就是它） */
export interface SplineModel {
    version: number;
    name: string;
    interpolation: InterpolationType;
    controlPoints: ControlPoint[];
    rules: ProjectRules;
    /** 机器人当前关节角（弧度），用于活动范围检查 */
    jointAngles: Record<string, number>;
    createdAt: string;
    updatedAt: string;
}
/** 曲率超差子区段 */
export interface CurvatureViolation {
    tStart: number;
    tEnd: number;
    length: number;
    maxCurvature: number;
    minBendRadius: number;
}
/** 关节包络越界子区段 */
export interface EnvelopeViolation {
    jointId: string;
    tStart: number;
    tEnd: number;
    length: number;
}
/** 单个分段（按关节）的统计 */
export interface SegmentStat {
    segmentId: string;
    segmentName: string;
    jointId: string;
    length: number;
    curvatureViolationLength: number;
    envelopeViolationLength: number;
    maxCurvature: number;
}
/** 一次完整几何检查的结果摘要（随版本快照保存） */
export interface InspectionResult {
    totalLength: number;
    minBendRadius: number;
    curvatureViolations: CurvatureViolation[];
    envelopeViolations: EnvelopeViolation[];
    /** 层间最小间隙实测值 (mm)，null 表示未生成双层 */
    minMeasuredGap: number | null;
    minGapPass: boolean;
    segmentStats: SegmentStat[];
    /** 展开面积与管侧面积守恒校验误差（百分比） */
    unfoldAreaErrorPct: number | null;
}
/** 平面下料图数据 */
export interface FlatPattern {
    width: number;
    height: number;
    /** 外轮廓多边形（闭合，mm） */
    outline: Vec2[];
    /** 对位线：分段边界处的横向标记线 */
    alignmentMarks: {
        from: Vec2;
        to: Vec2;
        label: string;
    }[];
    /** 切口线 */
    cutLines: {
        from: Vec2;
        to: Vec2;
        kind: 'seam' | 'segment' | 'notch';
    }[];
    /** 文字标注 */
    labels: {
        position: Vec2;
        text: string;
        size: number;
    }[];
    /** 网格参考线（可选显示） */
    gridLines: {
        from: Vec2;
        to: Vec2;
    }[];
    area: number;
}
export type Vec2 = [number, number];
export interface ProjectDto {
    id: string;
    name: string;
    code: string;
    robotConfigId: string;
    status: ReviewStatus;
    rules: ProjectRules;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
}
export interface ProjectVersionDto {
    id: string;
    projectId: string;
    version: number;
    changeNote: string;
    model: SplineModel;
    inspection: InspectionResult | null;
    createdBy: string;
    createdAt: string;
}
export interface ReviewRecordDto {
    id: string;
    projectId: string;
    version: number;
    status: ReviewStatus;
    comment: string;
    reviewerName: string;
    createdAt: string;
}
export interface UserDto {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
}
export interface AuthResponse {
    token: string;
    user: UserDto;
}
