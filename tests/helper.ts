import type { Contour, PathShape } from '../src/types.ts'
export const mkShapeHelper = (id: string, contour: Contour): PathShape => ({
  id, name: id, layerId: 'L1', color: '#f00', contours: [contour], createdAt: 0,
})
