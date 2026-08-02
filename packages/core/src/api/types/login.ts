// 认证相关类型已下沉到 ../../types/auth，此处再导出以保持既有 import 来源兼容
import type { AuthMode, ISingleTokenRes, IDoubleTokenRes, IAuthLoginRes } from '../../types/auth'
export type { AuthMode, ISingleTokenRes, IDoubleTokenRes, IAuthLoginRes } from '../../types/auth'
export { isSingleTokenRes, isDoubleTokenRes } from '../../types/auth'

/**
 * 用户信息
 */
export type UserRole = string

export interface IUserInfoRes {
  userId: number
  username: string
  nickname: string
  avatar?: string
  /** 同时支持单角色和多角色，你自行选择一种就行 */
  role?: UserRole
  roles?: UserRole[]
  [key: string]: any // 允许其他扩展字段
}

// 认证存储数据结构
export interface AuthStorage {
  mode: AuthMode
  tokens: ISingleTokenRes | IDoubleTokenRes
  userInfo?: IUserInfoRes
  loginTime: number // 登录时间戳
}

/**
 * 获取验证码
 */
export interface ICaptcha {
  captchaEnabled: boolean
  uuid: string
  image: string
}

/**
 * 上传成功的信息
 */
export interface IUploadSuccessInfo {
  fileId: number
  originalName: string
  fileName: string
  storagePath: string
  fileHash: string
  fileType: string
  fileBusinessType: string
  fileSize: number
}

/**
 * 更新用户信息
 */
export interface IUpdateInfo {
  id: number
  name: string
  sex: string
}

/**
 * 更新用户信息
 */
export interface IUpdatePassword {
  id: number
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
