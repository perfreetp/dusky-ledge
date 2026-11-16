// 共享类型定义。所有几何尺寸单位均为毫米(mm)。

export interface Pt {
  x: number;
  y: number;
}

export type BoolOp = 'union' | 'subtract' | 'intersect';

export interface Contour {
  id: string;
  points: Pt[];
  closed: boolean;
  op: BoolOp;
}

export type MaterialKey = 'matte-black' | 'champagne' | 'fluoro-gray';
export type LightMode = 'sun' | 'spots';

export interface PanelDesign {
  id: string;
  name: string;
  contours: Contour[];
  thickness: number; // mm, 2–8
  material: MaterialKey;
  updatedAt: string;
}

export type GateType = '单开门' | '双开门' | '子母门' | '移门';

export type OrderStatus =
  | '待制作'
  | '制作中'
  | '待审核'
  | '已退回'
  | '已通过';

export interface Order {
  id: string;
  customer: string;
  gateType: GateType;
  openingW: number; // 洞口宽 mm
  openingH: number; // 洞口高 mm
  createdAt: string;
  status: OrderStatus;
  panels: PanelDesign[];
  reworkCount: number; // 返工次数
  deadline: string; // 交付截止时间 ISO 日期
  reviewNote: string; // 主管退回意见
}

export const MATERIAL_LABELS: Record<MaterialKey, string> = {
  'matte-black': '哑光黑',
  champagne: '香槟金',
  'fluoro-gray': '氟碳灰',
};

export const BOOL_OP_LABELS: Record<BoolOp, string> = {
  union: '并集',
  subtract: '差集',
  intersect: '交集',
};

export const GATE_TYPES: GateType[] = ['单开门', '双开门', '子母门', '移门'];

export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
  );
}
