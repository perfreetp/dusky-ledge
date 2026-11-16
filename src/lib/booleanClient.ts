// 布尔运算客户端：封装 Worker 通信；不支持 Worker 时回退主线程同步计算
import { booleanShapes } from '../lib/boolean.ts'
import type { BooleanOp, PathShape } from '../types.ts'
import type { BooleanRequest, BooleanResponse } from '../workers/boolean.worker.ts'

export interface BooleanOutcome {
  result: PathShape
  ms: number
  fingerprint?: number
  threaded: boolean
}

type Pending = {
  resolve: (o: BooleanOutcome) => void
  reject: (e: Error) => void
}

class BooleanClient {
  private worker: Worker | null = null
  private seq = 0
  private pending = new Map<number, Pending>()
  readonly threaded: boolean

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../workers/boolean.worker.ts', import.meta.url), {
          type: 'module',
        })
        this.worker.onmessage = (ev: MessageEvent<BooleanResponse>) => {
          const msg = ev.data
          const p = this.pending.get(msg.reqId)
          if (!p) return
          this.pending.delete(msg.reqId)
          if (msg.ok && msg.result) {
            p.resolve({ result: msg.result, ms: msg.ms, fingerprint: msg.fingerprint, threaded: true })
          } else {
            p.reject(new Error(msg.error || '布尔运算失败'))
          }
        }
        this.worker.onerror = e => {
          for (const [, p] of this.pending) p.reject(new Error(e.message))
          this.pending.clear()
        }
      } catch {
        this.worker = null
      }
    }
    this.threaded = !!this.worker
  }

  run(
    subjects: PathShape[],
    clips: PathShape[],
    op: BooleanOp,
    opts: BooleanRequest['opts'],
  ): Promise<BooleanOutcome> {
    if (!this.worker) {
      const t0 = performance.now()
      const result = booleanShapes(subjects, clips, op, opts)
      return Promise.resolve({ result, ms: performance.now() - t0, threaded: false })
    }
    const reqId = ++this.seq
    return new Promise<BooleanOutcome>((resolve, reject) => {
      this.pending.set(reqId, { resolve, reject })
      const req: BooleanRequest = { reqId, subjects, clips, op, opts }
      this.worker!.postMessage(req)
    })
  }
}

export const booleanClient = new BooleanClient()
