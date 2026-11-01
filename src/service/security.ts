import { http } from '@/http/http'

/** 通用文本内容安全检测，非 pass 结果由服务端返回对应错误 */
export function checkTextSecurityAPI(content: string) {
  return http.post<{ suggest: 'pass' }>('/api/text-security-check', { content })
}
