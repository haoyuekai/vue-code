import { proxyRefs } from '@vue/reactivity';
import { initProps, normalizePropsOptions } from './componentProps';
import { isFunction } from '@vue/shared';

/**
 * 创建组件实例
 * @param vnode
 */
export function createComponentInstance(vnode) {
    const { type } = vnode;
    const instance = {
        type,
        vnode,
        // 渲染函数
        render: null,
        // setup返回的状态
        setupState: null,
        propsOptions: normalizePropsOptions(type.props),
        props: {},
        attrs: {},
        // 子树， 就是 render 的返回值
        subTree: null,
        // 组件是否挂载
        isMounted: false,
    };

    return instance;
}

/**
 * 初始化组件
 * @param instance
 */
export function setupComponent(instance) {
    /**
     * 初始化属性
     */
    initProps(instance);
    const { type } = instance;

    const setupContext = createSetupContext(instance);

    if (isFunction(type.setup)) {
        const setupResult = proxyRefs(type.setup(instance.props, setupContext));

        // 拿到 setup 返回的状态
        instance.setupState = setupResult;
    }

    // 将 runder 函数给到 instance
    instance.render = type.render;
}

/**
 * 创建 setup context
 * @param instance
 * @returns
 */
function createSetupContext(instance) {
    return {
        get attrs() {
            return instance.attrs;
        },
    };
}
