import { isH5 } from '@uni-helper/uni-env'

// #ifndef MP-WEIXIN
import COS from 'cos-js-sdk-v5'
// #endif
// #ifdef MP-WEIXIN
// eslint-disable-next-line ts/no-redeclare
import COS from 'cos-wx-sdk-v5'
// #endif
import { getEnvBaseUrl } from '@/utils/index'

let COS_AUTH_URL = `${getEnvBaseUrl()}/api/upload/cos-auth`
if (isH5 && JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
  // 自动拼接代理前缀
  COS_AUTH_URL = `/api/upload/cos-auth`
}

interface CosAuthData {
  credentials: {
    tmpSecretId: string
    tmpSecretKey: string
    sessionToken: string
  }
  startTime: number
  expiredTime: number
  bucket: string
  region: string
}

let cosInstance: any = null

function getCosInstance(authData: CosAuthData) {
  if (cosInstance)
    return cosInstance

  cosInstance = new COS({
    getAuthorization: (options: any, callback: any) => {
      callback({
        TmpSecretId: authData.credentials.tmpSecretId,
        TmpSecretKey: authData.credentials.tmpSecretKey,
        SecurityToken: authData.credentials.sessionToken,
        StartTime: authData.startTime,
        ExpiredTime: authData.expiredTime,
      })
    },
  })

  return cosInstance
}

interface ThumbnailOptions {
  enabled: boolean
  width?: number
  height?: number
  quality?: number
  mode?: 'scale' | 'cut' | 'cover'
}

interface UploadResult {
  url: string
  key: string
  thumbnailUrl?: string
  thumbnailKey?: string
}

/**
 * Upload file to COS
 * @param filePath Local file path
 * @param fileName File name (optional)
 * @param cacheMaxAge Cache max age in seconds (default: 31536000 = 1 year)
 * @param thumbnail Thumbnail generation options (optional)
 */
export async function uploadToCos(
  filePath: string,
  fileName?: string,
  cacheMaxAge: number = 31536000,
  thumbnail?: ThumbnailOptions,
): Promise<UploadResult> {
  try {
    // 1. Get credentials
    const authData = await new Promise<CosAuthData>((resolve, reject) => {
      uni.request({
        url: COS_AUTH_URL,
        method: 'GET',
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as CosAuthData)
          }
          else {
            reject(new Error(`Failed to get COS auth: ${res.statusCode}`))
          }
        },
        fail: err => reject(err),
      })
    })

    // 2. Initialize COS
    const cos = getCosInstance(authData)

    // 3. Generate key
    const ext = fileName ? fileName.split('.').pop() : filePath.split('.').pop()
    const key = `uploads/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

    // 4. Build Pic-Operations header for thumbnail generation
    let picOperations: string | undefined
    if (thumbnail?.enabled) {
      const thumbnailKey = key.replace(/\.([^./]+)$/, '_thumb.$1')
      const rules: string[] = []

      // Build thumbnail processing rules
      if (thumbnail.width || thumbnail.height) {
        const width = thumbnail.width || ''
        const height = thumbnail.height || ''
        rules.push(`imageMogr2/thumbnail/${width}x${height}`)
      }
      if (thumbnail.quality) {
        rules.push(`/quality/${thumbnail.quality}`)
      }

      const operation = {
        is_pic_info: 0,
        rules: [{
          fileid: thumbnailKey,
          rule: rules.join(''),
        }],
      }
      picOperations = JSON.stringify(operation)
    }

    // 5. Upload
    return new Promise<UploadResult>((resolve, reject) => {
      // #ifdef MP-WEIXIN
      cos.postObject({
        Bucket: authData.bucket,
        Region: authData.region,
        Key: key,
        FilePath: filePath,
        Headers: {
          'Cache-Control': `max-age=${cacheMaxAge}`,
          ...(picOperations && { 'Pic-Operations': picOperations }),
        },
        onProgress: (info: any) => {
          console.log('Upload progress:', info)
        },
      }, (err: any, data: any) => {
        console.log('Upload result:', err, data)
        if (err) {
          reject(err)
        }
        else {
          const url = `https://${authData.bucket}.cos.${authData.region}.myqcloud.com/${key}`
          const result: UploadResult = { url, key }

          // Extract thumbnail info from response
          if (data?.ProcessResults?.Object?.[0]) {
            const thumbInfo = data.ProcessResults.Object[0]
            result.thumbnailKey = thumbInfo.Key
            result.thumbnailUrl = `https://${authData.bucket}.cos.${authData.region}.myqcloud.com/${thumbInfo.Key}`
          }

          resolve(result)
        }
      })
      // #endif

      // #ifndef MP-WEIXIN
      // For H5/App, we need to handle file differently if needed
      // Fetch blob if it's a blob url (H5)
      const upload = (body: any) => {
        cos.putObject({
          Bucket: authData.bucket,
          Region: authData.region,
          Key: key,
          Body: body,
          Headers: {
            'Cache-Control': `max-age=${cacheMaxAge}`,
            ...(picOperations && { 'Pic-Operations': picOperations }),
          },
          onProgress: (info: any) => {
            console.log('Upload progress:', info)
          },
        }, (err: any, data: any) => {
          console.log('Upload result:', err, data)
          if (err) {
            reject(err)
          }
          else {
            const url = `https://${authData.bucket}.cos.${authData.region}.myqcloud.com/${key}`
            const result: UploadResult = { url, key }

            // Extract thumbnail info from response
            if (data?.ProcessResults?.Object?.[0]) {
              const thumbInfo = data.ProcessResults.Object[0]
              result.thumbnailKey = thumbInfo.Key
              result.thumbnailUrl = `https://${authData.bucket}.cos.${authData.region}.myqcloud.com/${thumbInfo.Key}`
            }

            resolve(result)
          }
        })
      }

      if (filePath.startsWith('blob:')) {
        fetch(filePath).then(res => res.blob()).then((blob) => {
          upload(blob)
        }).catch(reject)
      }
      else {
        // Assume it's a file object or something COS SDK can handle, or we need to read it
        // For App, filePath is a path, COS JS SDK might not handle path string directly in environment without File API
        // But uni-app environment on App might need specific handling.
        // For now assume H5 blob url or File object passed as filePath (if typed as any)
        // But here filePath is string.
        upload(filePath)
      }
      // #endif
    })
  }
  catch (error) {
    console.error('COS Upload Error:', error)
    throw error
  }
}

/**
 * 构建 COS 视频封面 URL（使用 CI snapshot 截帧）
 * 自动处理 URL 上已有的 query string，正确选择 ? 或 & 作为分隔符
 *
 * @param url COS 视频文件的完整 URL
 * @param options.time 截帧时间点（秒），默认 1
 * @param options.width 封面宽度（px），默认 400
 * @param options.format 图片格式，默认 'jpg'
 * @param options.simplified 是否只生成基础截帧参数（仅 ci-process+time，不带 width/format），默认 false
 */
export function buildVideoCoverUrl(
  url: string,
  options: { time?: number, width?: number, format?: string, simplified?: boolean } = {},
): string {
  if (!url)
    return url
  const { time = 1, width = 400, format = 'jpg', simplified = false } = options
  const separator = url.includes('?') ? '&' : '?'
  const params = [`ci-process=snapshot`, `time=${time}`]
  if (!simplified) {
    if (format)
      params.push(`format=${format}`)
    if (width)
      params.push(`width=${width}`)
  }
  return `${url}${separator}${params.join('&')}`
}
