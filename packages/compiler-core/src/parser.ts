import { NodeTypes } from './ast';
import { isWhitespace, Tokenizer } from './tokenizer';

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

/**
 * 当前正在解析的属性
 */
let currentProp;

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

function isAllWhitespace(str) {
    for (let i = 0; i < str.length; i++) {
        if (!isWhitespace(str.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

function condenseWhitespace(children) {
    const _children = [...children];
    for (let i = 0; i < _children.length; i++) {
        const node = _children[i];
        if (node.type === NodeTypes.TEXT) {
            // 文本节点
            if (isAllWhitespace(node.content)) {
                if (i === 0 || i === _children.length - 1) {
                    // 剔除两端的空白字符
                    _children[i] = null;
                } else {
                    // 中间部分，压缩所有的空白字符
                    node.content = ' ';
                }
            }
        }
    }

    return _children.filter(Boolean);
}

const tokenizer = new Tokenizer({
    // 文本节点完成
    ontext(start, end) {
        const content = getSlice(start, end);
        const textNode = {
            content,
            type: NodeTypes.TEXT,
            loc: getLoc(start, end),
        };
        addNode(textNode);
    },
    // 开始标签名
    onopentagname(start, end) {
        const tag = getSlice(start, end);
        // 提升 currentOpenTag 作用域，后续操作使用
        currentOpenTag = {
            type: NodeTypes.ELEMENT,
            tag,
            children: [],
            // 标签未闭合，暂不准确
            loc: getLoc(start - 1, end),
        };
    },
    // 开始标签完成
    onopentagend() {
        addNode(currentOpenTag);
        stack.push(currentOpenTag);
        currentOpenTag = null;
    },
    // 闭合标签
    onclosetag(start, end) {
        const tag = getSlice(start, end);
        const lastNode = stack.pop();
        if (lastNode.tag === tag) {
            setLocEnd(lastNode.loc, end);
        } else {
            // throw new Error('错误的标签');
        }

        // 去除空字符
        lastNode.children = condenseWhitespace(lastNode.children);
    },
    // 属性名完成
    onattrname(start, end) {
        currentProp = {
            type: NodeTypes.ATTRIBUTE,
            name: getSlice(start, end),
            // 未解析完属性值，暂不准确
            loc: getLoc(start, end),
            value: undefined,
        };
    },
    // 属性值
    onattrvalue(start, end) {
        const value = getSlice(start, end);
        currentProp.value = value;
        setLocEnd(currentProp.loc, end);
        if (currentOpenTag) {
            if (!currentOpenTag.props) {
                currentOpenTag.props = [];
            }
            currentOpenTag.props.push(currentProp);
            currentProp = null;
        }
    },
    // 插值表达式
    oninterpolation(start, end) {
        let innerStart = start + 2;
        let innerEnd = end - 2;

        // 剔除插值表达式的空格
        while (isWhitespace(currentInput.charCodeAt(innerStart))) {
            innerStart++;
        }
        while (isWhitespace(currentInput.charCodeAt(innerEnd - 1))) {
            innerEnd--;
        }

        addNode({
            type: NodeTypes.INTERPOLATION,
            loc: getLoc(start, end),
            content: {
                type: NodeTypes.SIMPLE_EXPRESSION, // 简单表达式
                content: getSlice(innerStart, innerEnd),
                loc: getLoc(innerStart, innerEnd),
            },
        });
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
        loc: null,
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

    root.loc = getLoc(0, input.length);

    root.children = condenseWhitespace(root.children);

    return root;
}
