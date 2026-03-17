import { http } from '@/http/http'

interface WechatPayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

export interface CreateOrderResponse {
  orderId: string
  payParams: WechatPayParams
}

/** Create payment order */
export function createOrderAPI(collectionId: string) {
  return http.Post<CreateOrderResponse>('/api/payments/wechat', { collectionId })
}

/** Process wechat payment */
export function processWechatPayment(params: WechatPayParams): Promise<boolean> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      orderInfo: {
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign
      },
      success: () => {
        resolve(true)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}