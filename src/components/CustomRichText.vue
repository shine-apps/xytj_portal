<script setup lang="ts">
import { computed } from 'vue'
import { handleRichTextLinkTap, parseHtmlToRichTextNodes } from '@/utils/richText'

interface Props {
  content: string
  selectable?: boolean
  space?: 'nbsp' | 'ensp' | 'emsp'
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true,
  space: 'nbsp',
  className: '',
})

const richTextNodes = computed(() => {
  if (!props.content || props.content.trim() === '<p></p>')
    return []
  return parseHtmlToRichTextNodes(props.content)
})

const hasNodes = computed(() => richTextNodes.value.length > 0)
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <rich-text
    v-if="hasNodes"
    :nodes="richTextNodes"
    :selectable="selectable"
    :user-select="selectable"
    :space="space"
    :class="className"
    @tap="handleRichTextLinkTap"
  />
  <text v-else class="text-gray-400 italic">暂无内容</text>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <rich-text
    v-if="content"
    :nodes="content"
    :selectable="selectable"
    :space="space"
    :class="className"
  />
  <text v-else class="text-gray-400 italic">暂无内容</text>
  <!-- #endif -->
</template>
