/**
 * 认证相关类型定义。
 *
 * 原位于 `api/types/login.ts`，但 `http/http.ts` 与 `store/token.ts` 都需要引用
 * 这些 token 类型，若放在 api 层会导致「基础设施层（http/store）反向依赖应用层（api）」
 * 的循环依赖与分层倒置（见 CODE_REVIEW.md 的 ARCH-06）。故下沉到 `types/` 这一最底层。
 */

// 认证模式类型
export type AuthMode = 'single' | 'double'

// 单Token响应类型
export interface ISingleTokenRes {
  token: string
  expiresIn: number // 有效期(秒)
}

// 双Token响应类型
export interface IDoubleTokenRes {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number // 访问令牌有效期(秒)
  refreshExpiresIn: number // 刷新令牌有效期(秒)
}

/**
 * 登录返回的信息，其实就是 token 信息
 */
export type IAuthLoginRes = ISingleTokenRes | IDoubleTokenRes

/**
 * 判断是否为单Token响应
 * @param tokenRes 登录响应数据
 * @returns 是否为单Token响应
 */
export function isSingleTokenRes(tokenRes: IAuthLoginRes): tokenRes is ISingleTokenRes {
  return 'token' in tokenRes && !('refreshToken' in tokenRes)
}

/**
 * 判断是否为双Token响应
 * @param tokenRes 登录响应数据
 * @returns 是否为双Token响应
 */
export function isDoubleTokenRes(tokenRes: IAuthLoginRes): tokenRes is IDoubleTokenRes {
  return 'accessToken' in tokenRes && 'refreshToken' in tokenRes
}
