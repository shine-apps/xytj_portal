import type { RichTextNode, RichTextNodes } from '@uni-helper/uni-types'

export function parseHtmlToRichTextNodes(html: string): RichTextNodes {
  try {
    const result: RichTextNodes = []

    const supportedTags = new Set([
      'a',
      'abbr',
      'address',
      'article',
      'aside',
      'b',
      'bdi',
      'bdo',
      'big',
      'blockquote',
      'br',
      'caption',
      'center',
      'cite',
      'code',
      'col',
      'colgroup',
      'dd',
      'del',
      'div',
      'dl',
      'dt',
      'em',
      'fieldset',
      'font',
      'footer',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hr',
      'i',
      'img',
      'ins',
      'label',
      'legend',
      'li',
      'mark',
      'nav',
      'ol',
      'p',
      'pre',
      'q',
      'rt',
      'ruby',
      's',
      'section',
      'small',
      'span',
      'strong',
      'sub',
      'sup',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'tr',
      'tt',
      'u',
      'ul',
    ])

    const selfClosingTags = new Set(['br', 'hr', 'img'])

    interface TagInfo {
      type: 'open' | 'close' | 'self-closing' | 'text'
      tagName?: string
      attrs?: Record<string, string>
      content?: string
    }

    function tokenize(htmlString: string): TagInfo[] {
      const parts: TagInfo[] = []
      let pos = 0

      while (pos < htmlString.length) {
        const tagStart = htmlString.indexOf('<', pos)
        if (tagStart === -1) {
          const text = htmlString.slice(pos)
          if (text.trim()) {
            parts.push({ type: 'text', content: text })
          }
          break
        }

        if (tagStart > pos) {
          const text = htmlString.slice(pos, tagStart)
          if (text.trim()) {
            parts.push({ type: 'text', content: text })
          }
        }

        const remaining = htmlString.slice(tagStart)

        // 结束标签
        if (remaining.startsWith('</')) {
          const endIndex = remaining.indexOf('>')
          if (endIndex > 2) {
            const tagContent = remaining.slice(2, endIndex)
            const tagNameMatch = tagContent.match(/^[a-z][a-z0-9]*/i)
            if (tagNameMatch) {
              parts.push({ type: 'close', tagName: tagNameMatch[0].toLowerCase() })
              pos = tagStart + endIndex + 1
              continue
            }
          }
        }

        // 自闭合标签
        const selfCloseIndex = remaining.indexOf('/>')
        if (selfCloseIndex > 1) {
          const tagContent = remaining.slice(1, selfCloseIndex)
          const firstSpace = tagContent.search(/\s/)
          const tagName = firstSpace > 0 ? tagContent.slice(0, firstSpace) : tagContent
          if (/^[a-z][a-z0-9]*/i.test(tagName)) {
            const attrsStr = firstSpace > 0 ? tagContent.slice(firstSpace) : ''
            parts.push({
              type: 'self-closing',
              tagName: tagName.toLowerCase(),
              attrs: parseAttributes(attrsStr),
            })
            pos = tagStart + selfCloseIndex + 2
            continue
          }
        }

        // 开始标签
        const openEndIndex = remaining.indexOf('>')
        if (openEndIndex > 1) {
          const tagContent = remaining.slice(1, openEndIndex)
          const firstSpace = tagContent.search(/\s/)
          const tagName = firstSpace > 0 ? tagContent.slice(0, firstSpace) : tagContent
          if (/^[a-z][a-z0-9]*/i.test(tagName)) {
            const attrsStr = firstSpace > 0 ? tagContent.slice(firstSpace) : ''
            parts.push({
              type: 'open',
              tagName: tagName.toLowerCase(),
              attrs: parseAttributes(attrsStr),
            })
            pos = tagStart + openEndIndex + 1
            continue
          }
        }

        parts.push({ type: 'text', content: '<' })
        pos = tagStart + 1
      }

      return parts
    }

    const tokens = tokenize(html)
    const stack: Array<{ node: RichTextNode & { children: RichTextNode[] } }> = []

    for (const token of tokens) {
      if (token.type === 'text') {
        const currentChildren = stack.length > 0 ? stack[stack.length - 1].node.children : result
        currentChildren.push({
          type: 'text',
          text: token.content!,
        })
      }
      else if (token.type === 'open') {
        const tagName = token.tagName!

        if (!supportedTags.has(tagName)) {
          continue
        }

        const node: RichTextNode & { children: RichTextNode[] } = {
          name: tagName,
          type: 'node',
          attrs: token.attrs || {},
          children: [],
        }

        const currentChildren = stack.length > 0 ? stack[stack.length - 1].node.children : result
        currentChildren.push(node)

        if (!selfClosingTags.has(tagName)) {
          stack.push({ node })
        }
      }
      else if (token.type === 'close') {
        const tagName = token.tagName!

        while (stack.length > 0) {
          const top = stack[stack.length - 1]
          if (top.node.name === tagName) {
            stack.pop()
            break
          }
          stack.pop()
        }
      }
      else if (token.type === 'self-closing') {
        const tagName = token.tagName!

        if (!supportedTags.has(tagName)) {
          continue
        }

        const attrs = token.attrs || {}

        if (tagName === 'img') {
          const existingStyle = attrs.style || ''
          if (!existingStyle.includes('max-width')) {
            attrs.style = `max-width: 100%; height: auto;${existingStyle ? `; ${existingStyle}` : ''}`
          }
        }

        const currentChildren = stack.length > 0 ? stack[stack.length - 1].node.children : result

        if (tagName === 'br') {
          currentChildren.push({ type: 'text', text: '\n' })
        }
        else {
          currentChildren.push({
            name: tagName,
            type: 'node',
            attrs,
          })
        }
      }
    }

    function cleanNodes(nodes: RichTextNode[]): RichTextNode[] {
      return nodes.filter((node) => {
        if (node.type === 'text') {
          return node.text?.trim().length > 0
        }
        if ('children' in node && node.children) {
          node.children = cleanNodes(node.children)
        }
        return true
      })
    }

    return cleanNodes(result)
  }
  catch (error) {
    console.error('Error parsing HTML to rich text nodes:', error)
    return [{ type: 'text', text: html }]
  }
}

function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([^\s=]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let attrMatch

  // eslint-disable-next-line no-cond-assign
  while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
    const key = attrMatch[1].toLowerCase()
    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''
    attrs[key] = decodeHTMLEntities(value)
  }

  return attrs
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': '\'',
    '&apos;': '\'',
  }

  return text.replace(/&[#\w]+;/g, match => entities[match] || match)
}

export function handleRichTextLinkTap(e: any) {
  const { href } = e.detail?.attrs || {}

  if (!href) {
    return null
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    const encodedUrl = encodeURIComponent(href)

    if (typeof uni !== 'undefined' && uni.navigateTo) {
      uni.navigateTo({
        url: `/pages/webview/webview?url=${encodedUrl}`,
      })
    }

    return true
  }

  return false
}

export function shouldUseRichTextNodes(): boolean {
  return typeof wx !== 'undefined' || typeof uni !== 'undefined'
}
