/**
 * 封装操作 DOM 节点的方法
 */
export const nodeOps = {
    // 插入节点
    insert(el, parent, anchor) {
        // insertBefore第二个参数为null，等价于 parent.appendChild(el);
        parent.insertBefore(el, anchor || null);
    },
    // 创建元素
    createElement(tag) {
        return document.createElement(tag);
    },
    // 设置元素文本内容
    setElementText(el, text) {
        el.textContent = text;
    },
    // 创建文本节点
    createText(el, text) {
        return document.createTextNode(text);
    },
    // 设置文本节点内容
    setText(node, text) {
        node.nodeValue = text;
    },
    // 获取父节点
    parentNode(el) {
        return el.parentNode;
    },
    // 获取下一个兄弟节点
    nextSibling(el) {
        return el.nextSibling;
    },
    // 查询选择器
    querySelector(selector) {
        return document.querySelector(selector);
    },
    // 移除节点
    remove(el) {
        const parent = el.parentNode;
        if (parent) {
            parent.removeChild(el);
        }
    },
};
