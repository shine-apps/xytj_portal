import { describe, it, expect } from 'vitest'
import { ResultEnum, ContentTypeEnum, ShowMessage } from '../../../src/http/tools/enum'

describe('ResultEnum', () => {
  it('should have correct success values', () => {
    expect(ResultEnum.Success0).toBe(0)
    expect(ResultEnum.Success200).toBe(200)
  })

  it('should have correct error values', () => {
    expect(ResultEnum.Error).toBe(400)
    expect(ResultEnum.Unauthorized).toBe(401)
    expect(ResultEnum.Forbidden).toBe(403)
    expect(ResultEnum.NotFound).toBe(404)
  })

  it('should have correct server error values', () => {
    expect(ResultEnum.InternalServerError).toBe(500)
    expect(ResultEnum.NotImplemented).toBe(501)
    expect(ResultEnum.BadGateway).toBe(502)
    expect(ResultEnum.ServiceUnavailable).toBe(503)
    expect(ResultEnum.GatewayTimeout).toBe(504)
    expect(ResultEnum.HttpVersionNotSupported).toBe(505)
  })
})

describe('ContentTypeEnum', () => {
  it('should have correct content types', () => {
    expect(ContentTypeEnum.JSON).toBe('application/json;charset=UTF-8')
    expect(ContentTypeEnum.FORM_URLENCODED).toBe('application/x-www-form-urlencoded;charset=UTF-8')
    expect(ContentTypeEnum.FORM_DATA).toBe('multipart/form-data;charset=UTF-8')
  })
})

describe('ShowMessage', () => {
  it('should return message for 400', () => {
    expect(ShowMessage(400)).toContain('请求错误')
  })

  it('should return message for 401', () => {
    expect(ShowMessage(401)).toContain('未授权')
  })

  it('should return message for 403', () => {
    expect(ShowMessage(403)).toContain('拒绝访问')
  })

  it('should return message for 404', () => {
    expect(ShowMessage(404)).toContain('请求出错')
  })

  it('should return message for 500', () => {
    expect(ShowMessage(500)).toContain('服务器错误')
  })

  it('should return message for 502', () => {
    expect(ShowMessage(502)).toContain('网络错误')
  })

  it('should return message for 503', () => {
    expect(ShowMessage(503)).toContain('服务不可用')
  })

  it('should return message for 504', () => {
    expect(ShowMessage(504)).toContain('网络超时')
  })

  it('should return default message for unknown status', () => {
    expect(ShowMessage(999)).toContain('连接出错')
  })

  it('should include contact admin suffix', () => {
    expect(ShowMessage(400)).toContain('请检查网络或联系管理员')
  })
})
