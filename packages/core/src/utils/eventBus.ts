/**
 * 极简事件总线，用于 core 与 ui 之间的解耦通信。
 *
 * 例如路由拦截器（core）需要通知自定义 tabbar（ui）同步高亮下标，
 * 但 core 不应反向依赖 ui 包，因此 core 只负责 emit 事件，
 * 由 ui 包自行订阅，保持「ui 依赖 core、core 不感知 ui」的分层。
 */
type EventHandler = (payload?: any) => void

const listeners = new Map<string, Set<EventHandler>>()

export function on(event: string, handler: EventHandler): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)!.add(handler)
  // 返回取消订阅函数
  return () => off(event, handler)
}

export function off(event: string, handler: EventHandler): void {
  listeners.get(event)?.delete(handler)
}

export function emit(event: string, payload?: any): void {
  listeners.get(event)?.forEach(handler => handler(payload))
}
