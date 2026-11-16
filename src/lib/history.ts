// 撤销/重做栈：容量上限 100 步（要求至少 50 步）
import { createSignal } from 'solid-js'
import { clone } from './utils.ts'

export interface HistoryEntry<T> {
  state: T
  label: string
  at: number
}

export class History<T> {
  private past: HistoryEntry<T>[] = []
  private future: HistoryEntry<T>[] = []
  readonly capacity = 100
  private _canUndo = createSignal(false)
  private _canRedo = createSignal(false)
  readonly canUndo = this._canUndo[0]
  readonly canRedo = this._canRedo[0]
  /** 当前状态标签（最近一次提交） */
  private _label = createSignal('初始状态')
  readonly label = this._label[0]

  constructor(private current: T) {}

  private sync() {
    this._canUndo[1](this.past.length > 0)
    this._canRedo[1](this.future.length > 0)
  }

  /** 在变更前调用：把当前状态压入 past，清空 future */
  commit(next: T, label: string) {
    this.past.push({ state: clone(this.current), label: this._label[0](), at: Date.now() })
    if (this.past.length > this.capacity) this.past.shift()
    this.current = next
    this.future = []
    this._label[1](label)
    this.sync()
  }

  /** 仅替换当前状态而不入栈（连续拖拽等临时态用） */
  replace(next: T) {
    this.current = next
  }

  undo(): T | null {
    const prev = this.past.pop()
    if (!prev) return null
    this.future.push({ state: clone(this.current), label: this._label[0](), at: Date.now() })
    this.current = prev.state
    this._label[1](prev.label)
    this.sync()
    return clone(this.current)
  }

  redo(): T | null {
    const next = this.future.pop()
    if (!next) return null
    this.past.push({ state: clone(this.current), label: this._label[0](), at: Date.now() })
    this.current = next.state
    this._label[1](next.label)
    this.sync()
    return clone(this.current)
  }

  get value(): T {
    return this.current
  }

  get depth(): { past: number; future: number } {
    return { past: this.past.length, future: this.future.length }
  }
}
