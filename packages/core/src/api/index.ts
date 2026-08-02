// 注意：foo-alova.ts 与 foo.ts 导出了同名的 foo / IFoo，
// 为避免 barrel 导出冲突，将 foo-alova 以命名空间方式再导出。
export * from './foo'
export * as fooAlova from './foo-alova'
export * from './login'
export * from './types/login'
