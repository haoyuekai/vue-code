import { proxyRefs } from '@vue/reactivity';

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
        props: {},
        attrs: {},
        // 子树， 就是 render 的返回值
        subTree: null,
        // 组件是否挂载
        isMounted: false,
    };

    return instance;
}

export function setupComponent(instance) {
    const { type } = instance;

    const setupResult = proxyRefs(type.setup());

    // 拿到 setup 返回的状态
    instance.setupState = setupResult;

    // 将 runder 函数给到 instance
    instance.render = type.render;
}
