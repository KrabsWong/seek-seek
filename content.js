let currentHighlights = [];
let currentHighlightIndex = -1;

// 清除现有的高亮
function clearHighlights() {
  currentHighlights.forEach(highlight => {
    const wrapper = highlight.parentNode;
    if (wrapper && wrapper.classList.contains('ss-highlight-wrapper')) {
      const parent = wrapper.parentNode;
      if (parent) {
        // 获取原始文本内容
        const textContent = highlight.textContent.replace(/\[\d+\]/g, '').trim();
        parent.replaceChild(document.createTextNode(textContent), wrapper);
        parent.normalize();
      }
    }
  });
  currentHighlights = [];
  currentHighlightColor = null;
  currentHighlightIndex = -1;
}

// 高亮文本
// 检查元素是否可见
function isElementVisible(element) {
  if (!element || element.nodeType !== 1) return true;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // 检查所有父元素的可见性
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.opacity === '0') {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}

function highlightText(node, regex) {
  // 检查节点是否可见
  if (node.nodeType === 1) {
    if (!isElementVisible(node)) {
      return 0;
    }
    // 检查是否是不需要处理的标签
    if (['script', 'style', 'noscript', 'textarea'].includes(node.tagName.toLowerCase()) ||
      node.className === 'ss-highlight') {
      return 0;
    }
    // 处理子节点
    let count = 0;
    for (let child of Array.from(node.childNodes)) {
      count += highlightText(child, regex);
    }
    return count;
  }

  if (node.nodeType === 3) { // 文本节点
    // 检查父元素是否可见
    if (!isElementVisible(node.parentElement)) {
      return 0;
    }

    let matches = node.textContent.matchAll(regex);
    let count = 0;
    let lastIndex = 0;
    let fragment = document.createDocumentFragment();
    let currentNode = node;

    for (let match of matches) {
      // 添加未匹配的文本
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex, match.index)));
      }

      // 创建包装容器
      const wrapper = document.createElement('span');
      wrapper.className = 'ss-highlight-wrapper';

      // 创建高亮节点
      const span = document.createElement('span');
      span.className = 'ss-highlight';

      // 创建角标节点并添加到高亮节点内部
      const indexSpan = document.createElement('span');
      indexSpan.className = 'ss-index';
      indexSpan.textContent = `[${currentHighlights.length + 1}]`;
      span.appendChild(indexSpan);

      // 设置匹配文本
      span.appendChild(document.createTextNode(match[0]));

      wrapper.appendChild(span);
      currentHighlights.push(span);

      fragment.appendChild(wrapper);
      lastIndex = match.index + match[0].length;
      count++;
    }

    // 添加剩余的文本
    if (lastIndex < node.textContent.length) {
      fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
    }

    if (count > 0) {
      node.parentNode.replaceChild(fragment, node);
      return count;
    }
  } else if (node.nodeType === 1 && // 元素节点
    !['script', 'style', 'noscript', 'textarea'].includes(node.tagName.toLowerCase()) &&
    node.className !== 'ss-highlight') {
    let count = 0;
    for (let child of Array.from(node.childNodes)) {
      count += highlightText(child, regex);
    }
    return count;
  }
  return 0;
}

// 清理搜索状态和高亮
function cleanupSearch() {
  clearHighlights();
  return { count: 0, current: 0 };
}

// 搜索文本
function searchText(query, caseSensitive) {
  if (!query) return cleanupSearch();

  // 始终使用大小写敏感的标志
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(query.replace(/[.*+?^${}()|[]]/g, '\$&'), flags);

  const count = highlightText(document.body, regex);
  currentHighlightIndex = count > 0 ? 0 : -1;

  if (count > 0) {
    const currentHighlight = currentHighlights[currentHighlightIndex];
    currentHighlight.classList.add('current');
    currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return { count, current: count > 0 ? 1 : 0 };
}

function goToNextMatch() {
  if (currentHighlights.length === 0) return { count: 0, current: 0 };

  // 移除上一个选中项的样式和角标
  if (currentHighlightIndex >= 0 && currentHighlightIndex < currentHighlights.length) {
    currentHighlights[currentHighlightIndex].classList.remove('current');
  }

  // 更新当前索引
  currentHighlightIndex = (currentHighlightIndex + 1) % currentHighlights.length;

  // 为当前选中项添加样式和角标
  const currentHighlight = currentHighlights[currentHighlightIndex];
  currentHighlight.classList.add('current');

  // 滚动到当前选中项
  currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return {
    count: currentHighlights.length,
    current: currentHighlightIndex + 1
  };
}

function goToPrevMatch() {
  if (currentHighlights.length === 0) return { count: 0, current: 0 };

  // 移除上一个选中项的样式和角标
  if (currentHighlightIndex >= 0 && currentHighlightIndex < currentHighlights.length) {
    currentHighlights[currentHighlightIndex].classList.remove('current');
  }

  // 更新当前索引
  currentHighlightIndex = (currentHighlightIndex - 1 + currentHighlights.length) % currentHighlights.length;

  // 为当前选中项添加样式和角标
  const currentHighlight = currentHighlights[currentHighlightIndex];
  currentHighlight.classList.add('current');

  // 滚动到当前选中项
  currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return {
    count: currentHighlights.length,
    current: currentHighlightIndex + 1
  };
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search') {
    const searchResponse = searchText(request.query, request.caseSensitive);
    sendResponse({ ...searchResponse })
  } else if (request.action === 'clear') {
    sendResponse(cleanupSearch());
  } else if (request.action === 'next') {
    const result = goToNextMatch();
    sendResponse(result);
  } else if (request.action === 'prev') {
    const result = goToPrevMatch();
    sendResponse(result);
  }
  return true;
});