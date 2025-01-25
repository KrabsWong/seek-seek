<template>
  <div class="ss-container">
    <div class="ss-search-row">
      <div class="ss-search-box">
        <input
          type="text"
          v-model="searchQuery"
          :placeholder="t('searchPlaceholder')"
          @keypress="handleKeyPress"
          @input="handleInput"
          ref="searchInput"
        >
        <div class="ss-match-count">
          <span>{{ currentMatch }}/{{ matchCount }}</span>
        </div>
        <div class="ss-nav-buttons">
          <button @click="goToPrevMatch" class="ss-nav-btn">
            <img src="../assets/arrow-up.png" alt="Previous" class="ss-nav-icon">
          </button>
          <button @click="goToNextMatch" class="ss-nav-btn">
            <img src="../assets/arrow-down.png" alt="Next" class="ss-nav-icon">
          </button>
          <button @click="clearSearch" class="ss-close-btn">
            <img src="../assets/close.png" alt="Clear" class="ss-nav-icon">

          </button>
        </div>
      </div>
    </div>
    <div class="ss-config-row">
      <label class="ss-case-sensitive">
        <input
          type="checkbox"
          v-model="caseSensitive"
          @change="saveSettings"
        >
        <span>{{ t('caseSensitive') }}</span>
      </label>
      <div class="ss-shortcuts-group">
        <span v-if="shortcut">{{ shortcut }}</span>
        <button @click="customizeShortcut" class="ss-customize-shortcut" title="Customize shortcut">
          <img src="../assets/setting.png" alt="Settings" class="nav-icon">
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'

const searchQuery = ref('')
const caseSensitive = ref(true)
const shortcut = ref('')
const matchCount = ref(0)
const currentMatch = ref(0)
const lastSearchQuery = ref('')
const searchInput = ref(null)

// 防抖函数
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 国际化函数
const t = (key) => chrome.i18n.getMessage(key)

// 计算属性：匹配计数文本
const matchCountText = computed(() => {
  if (matchCount.value === 0) return t('noMatches')
  return `Found ${matchCount.value} matches (current: ${currentMatch.value})`
})

// 检查连接状态并发送消息
const sendMessageWithRetry = async (tabId, message, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message)
      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
    }
  }
}

// 执行搜索
const performSearch = async () => {
  if (!searchQuery.value) {
    matchCount.value = 0
    currentMatch.value = 0
    return
  }

  lastSearchQuery.value = searchQuery.value

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tabs?.[0]?.id) return

  try {
    // 先清理之前的搜索结果
    await sendMessageWithRetry(tabs[0].id, { action: 'clear' })

    // 执行新的搜索
    const response = await sendMessageWithRetry(tabs[0].id, {
      action: 'search',
      query: searchQuery.value,
      caseSensitive: caseSensitive.value
    })

    if (response) {
      matchCount.value = response.count
      currentMatch.value = response.current
    }
  } catch (error) {
    console.error('Search error:', error)
    matchCount.value = 0
    currentMatch.value = 0
  }
}

// 实时搜索处理函数
const handleInput = debounce(async () => {
  if (!searchQuery.value) {
    clearSearch()
  } else {
    performSearch()
  }
}, 100) // 将节流时间从300ms改为100ms

// 清空搜索
const clearSearch = async () => {
  searchQuery.value = ''
  matchCount.value = 0
  currentMatch.value = 0

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tabs?.[0]?.id) return

  try {
    await sendMessageWithRetry(tabs[0].id, { action: 'clear' })
  } catch (error) {
    console.error('清空搜索出错:', error)
  }
}

// 跳转到下一个匹配项
const goToNextMatch = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tabs?.[0]?.id) return

  try {
    const response = await sendMessageWithRetry(tabs[0].id, { action: 'next' })
    if (response) {
      matchCount.value = response.count
      currentMatch.value = response.current
    }
  } catch (error) {
    console.error('Invalid next match response:', error)
    matchCount.value = 0
    currentMatch.value = 0
  }
}

// 跳转到上一个匹配项
const goToPrevMatch = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tabs?.[0]?.id) return

  try {
    const response = await sendMessageWithRetry(tabs[0].id, { action: 'prev' })
    if (response) {
      matchCount.value = response.count
      currentMatch.value = response.current
    }
  } catch (error) {
    console.error('Invalid previous match response:', error)
    matchCount.value = 0
    currentMatch.value = 0
  }
}

// 处理按键事件
const handleKeyPress = (e) => {
  if (e.key === 'Enter') {
    if (searchQuery.value === lastSearchQuery.value) {
      goToNextMatch()
    } else {
      performSearch()
    }
  }
}

// 保存设置
const saveSettings = () => {
  chrome.storage.local.set({
    caseSensitive: caseSensitive.value
  })
}

// 自定义快捷键
const customizeShortcut = () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
}

// 更新快捷键显示
const updateShortcutText = async () => {
  try {
    const commands = await chrome.commands.getAll()
    const command = commands.find(cmd => cmd.name === '_execute_action')
    shortcut.value = command?.shortcut || ''
  } catch (error) {
    console.error('获取快捷键配置失败:', error)
    shortcut.value = ''
  }
}

// 清理搜索结果
const cleanup = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tabs?.[0]?.id) return

  try {
    await sendMessageWithRetry(tabs[0].id, { action: 'clear' })
  } catch (error) {
    console.error('Error clearing search results:', error)
  }
}

onMounted(async () => {
  // 清理页面中的搜索结果
  await cleanup()

  // 加载保存的设置
  chrome.storage.local.get(['caseSensitive'], (result) => {
    caseSensitive.value = result.caseSensitive !== false
  })

  // 更新快捷键显示
  updateShortcutText()

  // 监听快捷键变化
  chrome.commands.onCommand.addListener(updateShortcutText)

  // 自动聚焦搜索输入框
  searchInput.value?.focus()

  // 监听扩展卸载事件
  chrome.runtime.onSuspend.addListener(cleanup)

  // 建立与background.js的连接
  chrome.runtime.connect({ name: 'popup' })
})

// 在组件卸载前清理搜索结果和事件监听
onBeforeUnmount(() => {
  cleanup()
  chrome.commands.onCommand.removeListener(updateShortcutText)
  chrome.runtime.onSuspend.removeListener(cleanup)
})
</script>