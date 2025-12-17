export enum CharCodes {
    Tab = 0x9, // "\t"
    NewLine = 0xa, // "\n"
    FormFeed = 0xc, // "\f"
    CarriageReturn = 0xd, // "\r"
    Space = 0x20, // " "
    ExclamationMark = 0x21, // "!"
    Number = 0x23, // "#"
    Amp = 0x26, // "&"
    SingleQuote = 0x27, // "'"
    DoubleQuote = 0x22, // '"'
    GraveAccent = 96, // "`"
    Dash = 0x2d, // "-"
    Slash = 0x2f, // "/"
    Zero = 0x30, // "0"
    Nine = 0x39, // "9"
    Semi = 0x3b, // ";"
    Lt = 0x3c, // "<"
    Eq = 0x3d, // "="
    Gt = 0x3e, // ">"
    Questionmark = 0x3f, // "?"
    UpperA = 0x41, // "A"
    LowerA = 0x61, // "a"
    UpperF = 0x46, // "F"
    LowerF = 0x66, // "f"
    UpperZ = 0x5a, // "Z"
    LowerZ = 0x7a, // "z"
    LowerX = 0x78, // "x"
    LowerV = 0x76, // "v"
    Dot = 0x2e, // "."
    Colon = 0x3a, // ":"
    At = 0x40, // "@"
    LeftSquare = 91, // "["
    RightSquare = 93, // "]"
    LeftCurlyBraces = 123, // "{"
    RightCurlyBraces = 125, // "}"
}

const defaultDelimitersOpen = new Uint8Array([123, 123]); // "{{"
const defaultDelimitersClose = new Uint8Array([125, 125]); // "}}"

/**
 * 解析器状态
 */
export enum State {
    /** 普通文本状态，处理标签和插值表达式之外的内容 */
    Text = 1,

    /** 插值表达式相关状态 */
    InterpolationOpen, // 开始解析插值表达式 {{
    Interpolation, // 解析插值表达式内容
    InterpolationClose, // 结束解析插值表达式 }}

    /** HTML标签相关状态 */
    BeforeTagName, // 遇到<后的状态，准备解析标签名
    InTagName, // 正在解析标签名
    InSelfClosingTag, // 处理自闭合标签 />
    BeforeClosingTagName, // 处理结束标签的开始 </
    InClosingTagName, // 解析结束标签的标签名
    AfterClosingTagName, // 结束标签名后的状态

    /** 属性和指令相关状态 */
    BeforeAttrName, // 准备解析属性名
    InAttrName, // 解析普通属性名
    InDirName, // 解析指令名（v-if, v-for等）
    InDirArg, // 解析指令参数（v-bind:arg）
    InDirDynamicArg, // 解析动态指令参数（v-bind:[arg]）
    InDirModifier, // 解析指令修饰符（v-on:click.prevent）
    AfterAttrName, // 属性名后的状态
    BeforeAttrValue, // 准备解析属性值
    InAttrValueDq, // 双引号属性值 "value"
    InAttrValueSq, // 单引号属性值 'value'
    InAttrValueNq, // 无引号属性值 value

    /** 声明相关状态 */
    BeforeDeclaration, // <!开始的声明
    InDeclaration, // 解析声明内容

    /** 处理指令相关状态 */
    InProcessingInstruction, // 处理XML处理指令 <?xml ?>

    /** 注释和CDATA相关状态 */
    BeforeComment, // 准备解析注释
    CDATASequence, // 解析CDATA序列
    InSpecialComment, // 特殊注释处理
    InCommentLike, // 类注释内容处理

    /** 特殊标签处理状态 */
    BeforeSpecialS, // 处理<script>或<style>
    BeforeSpecialT, // 处理<title>或<textarea>
    SpecialStartSequence, // 特殊标签的开始序列
    InRCDATA, // 处理RCDATA内容（script/style/textarea等）

    /** 实体解析状态 */
    InEntity, // 解析HTML实体（如&amp;）

    /** SFC相关状态 */
    InSFCRootTagName, // 解析单文件组件根标签名
}

function isTagStart(c: number) {
    return (
        (c >= CharCodes.LowerA && c <= CharCodes.LowerZ) ||
        (c >= CharCodes.UpperA && c <= CharCodes.UpperZ)
    );
}

export function isWhitespace(c) {
    return (
        c === CharCodes.Space ||
        c === CharCodes.NewLine ||
        c === CharCodes.Tab ||
        c === CharCodes.FormFeed ||
        c === CharCodes.CarriageReturn
    );
}

function isEndOfTagSection(c) {
    return c === CharCodes.Slash || c === CharCodes.Gt || isWhitespace(c);
}

/**
 * 解析器
 * 基于状态机实现
 */
export class Tokenizer {
    /**
     * 状态机的状态
     * 在不同的状态下，要做的事情是不同的
     * eg:
     * State.Text => 表示当前正在解析文本内容
     * State.InTagName => 表示当前正在解析标签名
     */
    state = State.Text;

    /**
     * 当前正在解析的字符的下标
     */
    index = 0;

    /**
     * 解析开始的位置
     * 当前状态切换时候的初始位置
     */
    sectionStart = 0;

    /**
     * 保存当前正在解析的字符串
     */
    buffer = '';

    constructor(public cbs) {}

    parse(input: string) {
        this.buffer = input;

        while (this.index < this.buffer.length) {
            const c = this.buffer.charCodeAt(this.index);

            /**
             * 状态机
             */
            switch (this.state) {
                case State.Text: {
                    // 解析文本
                    this.stateText(c);
                    break;
                }
                case State.BeforeTagName: {
                    // 准备解析标签名
                    this.stateBeforeTagName(c);
                    break;
                }
                case State.InTagName: {
                    // 解析标签名
                    this.stateInTagName(c);
                    break;
                }
                case State.InClosingTagName: {
                    // 解析结束标签的标签名
                    this.stateInClosingTagName(c);
                    break;
                }
                case State.BeforeAttrName: {
                    // 准备解析属性名
                    this.stateBeforeAttrName(c);
                    break;
                }
                case State.InAttrName: {
                    // 解析属性名
                    this.stateInAttrName(c);
                    break;
                }
                case State.AfterAttrName: {
                    // 解析属性名后
                    this.stateAfterAttrName(c);
                    break;
                }
                case State.InAttrValueDq: {
                    // 解析双引号包裹的属性值
                    this.stateInAttrValueDq(c);
                    break;
                }
                case State.Interpolation: {
                    // 解析插值表达式
                    this.stateInterpolation(c);
                    break;
                }

                default:
                    break;
            }

            this.index++;
        }

        this.cleanup();
    }

    private peek() {
        return this.buffer.charCodeAt(this.index + 1);
    }

    /**
     * 解析文本
     * @param c
     */
    private stateText(c: number) {
        if (c === CharCodes.Lt) {
            // '<'
            // 状态流转到 解析标签
            if (this.sectionStart < this.index) {
                // 状态流转之前，处理文本内容
                this.cbs.ontext(this.sectionStart, this.index);
            }
            // 切换状态
            this.state = State.BeforeTagName;
            // 移动开始位置
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.LeftCurlyBraces) {
            // '{' 可能是插值表达式，需要判断下一位
            if (this.peek() === CharCodes.LeftCurlyBraces) {
                if (this.sectionStart < this.index) {
                    // 状态流转之前，处理文本内容
                    this.cbs.ontext(this.sectionStart, this.index);
                }
                // 状态流转到 插值表达式
                this.state = State.Interpolation;
                this.sectionStart = this.index;
            }
        }
    }

    /**
     * 遇到 < 后的状态，准备解析标签名
     * @param c
     */
    private stateBeforeTagName(c: number) {
        if (isTagStart(c)) {
            // 开始标签
            this.state = State.InTagName;
            this.sectionStart = this.index;
        } else if (c === CharCodes.Slash) {
            // 标签闭合
            this.state = State.InClosingTagName;
            // 从下一个字符开始
            this.sectionStart = this.index + 1;
        } else {
            // 不是标签
            this.state = State.Text;
        }
    }

    /**
     * 解析标签名
     * @param c
     */
    private stateInTagName(c: number) {
        if (c === CharCodes.Gt || isWhitespace(c)) {
            // 标签名解析结束
            this.cbs.onopentagname(this.sectionStart, this.index);
            // 准备解析属性名
            this.state = State.BeforeAttrName;
            this.sectionStart = this.index;
            this.stateBeforeAttrName(c);
        }
    }

    /**
     * 解析结束标签的标签名
     * @param c
     */
    private stateInClosingTagName(c: number) {
        if (c === CharCodes.Gt) {
            // 开始标签解析完
            this.cbs.onclosetag(this.sectionStart, this.index);
            // 状态流转到 文本
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        }
    }

    /**
     * 准备解析属性名
     * @param c
     */
    private stateBeforeAttrName(c: number) {
        if (c === CharCodes.Gt) {
            // '>'
            // 开始标签解析完
            this.cbs.onopentagend();
            // 状态流转到 文本
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.Slash) {
            // '/'
            // this.state = State.InSelfClosingTag;
        } else if (isWhitespace(c)) {
            // 开始解析属性
            this.state = State.InAttrName;
            this.sectionStart = this.index;
        }
    }

    /**
     * 解析属性名
     * @param c
     */
    private stateInAttrName(c: number) {
        if (c === CharCodes.Eq || isEndOfTagSection(c)) {
            // '=' 或者 布尔属性 属性名解析完成
            this.cbs.onattrname(this.sectionStart, this.index);
            // 切换状态
            this.state = State.AfterAttrName;
            this.sectionStart = this.index;
        }
    }

    /**
     * 解析属性名后
     * @param c
     */
    private stateAfterAttrName(c: number) {
        if (c === CharCodes.DoubleQuote) {
            // 双引号属性值
            this.state = State.InAttrValueDq;
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.SingleQuote) {
            // 单引号属性值 (TODO: 暂不考虑)
            this.state = State.InAttrValueSq;
            this.sectionStart = this.index + 1;
        }
    }

    /**
     * 解析双引号属性值
     * @param c
     */
    private stateInAttrValueDq(c: number) {
        if (c === CharCodes.DoubleQuote) {
            // 双引号属性值解析完成
            this.cbs.onattrvalue(this.sectionStart, this.index);

            //
            this.state = State.BeforeAttrName;
            this.sectionStart = this.index;
        }
    }

    /**
     * 解析插值表达式
     * @param c
     */
    private stateInterpolation(c: number) {
        if (c === CharCodes.RightCurlyBraces) {
            if (this.peek() === CharCodes.RightCurlyBraces) {
                this.index++;
                this.cbs.oninterpolation(this.sectionStart, this.index + 1);
                // 状态流转到文本
                this.state = State.Text;
                this.sectionStart = this.index + 1;
            }
        }
    }

    cleanup() {
        if (this.sectionStart < this.index) {
            // 证明还有没处理的字符
            if (this.state === State.Text) {
                // 要处理的是文本节点
                this.cbs.ontext(this.sectionStart, this.index);
                // 处理完移动 sectionStart 的位置
                this.sectionStart = this.index;
            }
        }
    }

    /**
     * 返回指定 index 的位置信息
     * @param index
     */
    getPos(index) {
        return {
            column: index + 1, // 列号
            line: 1, // 行号 TODO:暂不考虑换行
            offset: index, // 偏移量
        };
    }
}
