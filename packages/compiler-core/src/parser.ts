import { NodeTypes } from './ast';
import { Tokenizer } from './tokenizer';

/**
 * 当前正在处理的字符串
 */
let currentInput = '';

/**
 * 当前正在处理的字符串所属根节点
 */
let currentRoot;

/**
 * 当前正在解析的 标签
 */
let currentOpenTag;

function getSlice(start, end) {
    return currentInput.slice(start, end);
}

function getLoc(start, end) {
    return {
        // 开始的位置信息
        start: tokenizer.getPos(start),
        // 结束的位置信息
        end: tokenizer.getPos(end),
        // 解析出的内容
        source: getSlice(start, end),
    };
}

// 用来保存着正在处理的标签
const stack = [];
function addNode(node) {
    // 找到栈的最后一个，如果存在，加到他的子节点里面，否则加到根节点的子节点里面
    const lastNode = stack.at(-1) || currentRoot;
    lastNode.children.push(node);
}

function setLocEnd(loc, end) {
    loc.source = getSlice(loc.start.offset, end + 1);
    loc.end = tokenizer.getPos(end + 1);
}

const tokenizer = new Tokenizer({
    ontext(start, end) {
        const content = getSlice(start, end);
        const textNode = {
            content,
            type: NodeTypes.TEXT,
            loc: getLoc(start, end),
        };
        addNode(textNode);
    },
    onopentagname(start, end) {
        const tag = getSlice(start, end);
        // 提升 currentOpenTag 作用域，后续操作使用
        currentOpenTag = {
            type: NodeTypes.ELEMENT,
            tag,
            children: [],
            loc: getLoc(start - 1, end),
        };
    },
    onopentagend() {
        addNode(currentOpenTag);
        stack.push(currentOpenTag);
        currentOpenTag = null;
    },
    onclosetag(start, end) {
        const tag = getSlice(start, end);
        const lastNode = stack.pop();
        if (lastNode.tag === tag) {
            setLocEnd(lastNode.loc, end);
        } else {
            // throw new Error('错误的标签');
        }
    },
});

/**
 * 创建 ast 语法树的根节点
 * @param source
 * @returns
 */
function createRoot(source) {
    return {
        // 子节点
        children: [],
        // 根节点 type
        type: NodeTypes.ROOT,
        // 初始化的字符串
        source,
    };
}

export function parse(input) {
    // 把当前正在处理的字符串暴露到外部作用域
    currentInput = input;
    // 创建根节点
    const root = createRoot(input);
    // 把当前创建的根节点暴露到外部作用域
    currentRoot = root;
    /**
     * 开始解析 input
     */
    tokenizer.parse(input);

    return root;
}
