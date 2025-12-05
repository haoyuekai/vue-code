import { reactive } from '@vue/reactivity';
import { hasOwn, isArray } from '@vue/shared';

/**
 * props归一化函数
 * @param props
 * @returns
 */
export function normalizePropsOptions(props = {}) {
    if (isArray(props)) {
        /**
         * 把数组转换成对象
         * [ 'msg', 'count' ]
         * ==>
         * { 'msg': {}, 'count': {} }
         */
        return props.reduce((prev, cur) => {
            prev[cur] = {};
            return prev;
        }, {});
    }

    return props;
}

/**
 * 设置所有的 props  attrs
 * @param instance
 * @param rawProps
 * @param props
 * @param attrs
 */
function setFullProps(instance, rawProps, props, attrs) {
    const propsOptions = instance.propsOptions;
    if (rawProps) {
        for (const key in rawProps) {
            const value = rawProps[key];
            if (hasOwn(propsOptions, key)) {
                // 如果 propsOptions 里面有这个 key, 应该放到 props 里面
                props[key] = value;
            } else {
                // 如果没有，放到 attrs 里面
                attrs[key] = value;
            }
        }
    }
}

export function initProps(instance) {
    const { vnode } = instance;
    const rawProps = vnode.props;

    const props = {};
    const attrs = {};

    setFullProps(instance, rawProps, props, attrs);

    // props是响应式的，attrs不是响应式的
    instance.props = reactive(props);
    instance.attrs = attrs;
}

/**
 * 更新组件的属性
 * props 和 attrs
 */
export function updateProps(instance, nextVnode) {
    const { props, attrs } = instance;
    // 用户传入的 props，处理成响应式的 props 和 attrs
    const rawProps = nextVnode.props;
    /**
     * 设置所有的 props 和 attrs
     */
    setFullProps(instance, rawProps, props, attrs);

    /**
     * 删除不需要的（之前有，现在没有的 props 和 attrs）
     */
    for (const key in props) {
        if (!hasOwn(rawProps, key)) {
            delete props[key];
        }
    }
    for (const key in attrs) {
        if (!hasOwn(rawProps, key)) {
            delete attrs[key];
        }
    }
}
