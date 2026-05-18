<script setup lang="ts">
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

interface Props {
  content: string
  selectable?: boolean
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true,
  className: '',
})

function handleLinkTap(e: any) {
  const href = e.detail?.href || e.href
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  const title = e.detail?.title || e.title || e.detail?.innerText || e.innerText || ''

  if (!href)
    return

  if (href.startsWith('http://') || href.startsWith('https://')) {
    const encodedUrl = encodeURIComponent(href)
    const encodedTitle = encodeURIComponent(title)
    uni.navigateTo({
      url: `/pages/webview/webview?url=${encodedUrl}&title=${encodedTitle}`,
    })
  }
}
</script>

<template>
  <mp-html
    v-if="content"
    :content="content"
    :selectable="selectable"
    :preview-img="true"
    :copy-link="true"
    :set-title="false"
    :class="className"
    @linktap="handleLinkTap"
  />
  <text v-else class="text-gray-400 italic">暂无内容</text>
</template>
