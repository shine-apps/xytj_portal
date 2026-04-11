import { ref } from 'vue'
import { uploadToCos } from '@/utils/cos'

type TfileType = 'image' | 'video' | 'file'
type TImage = 'png' | 'jpg' | 'jpeg' | 'webp' | '*'
type TFile = 'doc' | 'docx' | 'ppt' | 'zip' | 'xls' | 'xlsx' | 'txt' | TImage

interface TOptions<T extends TfileType> {
  formData?: Record<string, any>
  maxSize?: number
  accept?: T extends 'image' ? TImage[] : TFile[]
  fileType?: T
  success?: (params: { url: string, key: string, size: number }) => void
  error?: (err: any) => void
}

export default function useUpload<T extends TfileType>(options: TOptions<T> = {} as TOptions<T>) {
  const {
    formData = {},
    maxSize = 5 * 1024 * 1024,
    accept = ['*'],
    fileType = 'image',
    success,
    error: onError,
  } = options

  const loading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<any>(null)

  const handleFileChoose = ({ tempFilePath, size }: { tempFilePath: string, size: number }) => {
    if (size > maxSize) {
      uni.showToast({
        title: `文件大小不能超过 ${maxSize / 1024 / 1024}MB`,
        icon: 'none',
      })
      return
    }

    loading.value = true
    uploadToCos(tempFilePath)
      .then(({ url, key }) => {
        data.value = { url, key }
        success?.({ url, key, size })
      })
      .catch((err) => {
        error.value = err
        onError?.(err)
      })
      .finally(() => {
        loading.value = false
      })
  }

  const run = () => {
    // 微信小程序从基础库 2.21.0 开始， wx.chooseImage 停止维护，请使用 uni.chooseMedia 代替。
    // 微信小程序在2023年10月17日之后，使用本API需要配置隐私协议
    const chooseFileOptions = {
      count: 1,
      success: (res: any) => {
        console.log('File selected successfully:', res)
        let tempFilePath = ''
        let size = 0
        // #ifdef MP-WEIXIN
        tempFilePath = res.tempFiles[0].tempFilePath
        size = res.tempFiles[0].size
        // #endif
        // #ifndef MP-WEIXIN
        tempFilePath = res.tempFilePaths[0]
        size = res.tempFiles[0].size
        // #endif
        handleFileChoose({ tempFilePath, size })
      },
      fail: (err: any) => {
        console.error('File selection failed:', err)
        error.value = err
        // 用户取消选择文件，不触发 success 回调
        onError?.(null)
      },
    }

    if (fileType === 'image') {
      // #ifdef MP-WEIXIN
      uni.chooseMedia({
        ...chooseFileOptions,
        mediaType: ['image'],
      })
      // #endif

      // #ifndef MP-WEIXIN
      uni.chooseImage(chooseFileOptions)
      // #endif
    }
    else if (fileType === 'video') {
      // 微信小程序和非微信小程序都使用 uni.chooseVideo
      uni.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60,
        success: (res: any) => {
          handleFileChoose({ tempFilePath: res.tempFilePath, size: res.size || 0 })
        },
        fail: (err: any) => {
          console.error('Video selection failed:', err)
          // uni.showToast({ title: '选择视频失败', icon: 'none' })
          error.value = err
          // 用户取消选择文件，不触发 success 回调
          onError?.(null)
        },
      })
    }
    else {
      uni.chooseFile({
        ...chooseFileOptions,
        type: 'all',
      })
    }
  }

  const upload = (tempFilePath: string, size: number = 0) => {
    handleFileChoose({ tempFilePath, size })
  }

  return { loading, error, data, run, upload }
}
