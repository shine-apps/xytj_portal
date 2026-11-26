import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getUnreadCountAPI } from '@/service/nearby'

export const useNearbyStore = defineStore(
  'nearby',
  () => {
    /** 全部会话的总未读数 */
    const unreadCount = ref(0)

    /** 是否有未读（驱动首页红点） */
    const hasUnread = computed(() => unreadCount.value > 0)

    /** 拉取总未读数；失败静默，避免影响首页/页面正常渲染 */
    async function fetchUnreadCount() {
      try {
        const res = await getUnreadCountAPI()
        unreadCount.value = res.unreadCount
      }
      catch (e) {
        console.error('Fetch nearby unread count failed', e)
      }
    }

    /** 归零（进入聊天页已读后本地立即同步） */
    function resetUnreadCount() {
      unreadCount.value = 0
    }

    return {
      unreadCount,
      hasUnread,
      fetchUnreadCount,
      resetUnreadCount,
    }
  },
)
