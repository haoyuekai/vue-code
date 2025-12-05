import { proxyRefs } from '@vue/reactivity';
import { initProps, normalizePropsOptions } from './componentProps';
import { hasOwn, isFunction, isObject } from '@vue/shared';
import { nextTick } from './scheduler';

/**
 * 创建组件实例
 * @param vnode
 */
export function createComponentInstance(vnode) {
    const { type } = vnode;
    const instance: any = {
        type,
        vnode,
        // 渲染函数
        render: null,
        // setup返回的状态
        setupState: {},
        // instance 的代理对象
        propsOptions: normalizePropsOptions(type.props),
        props: {},
        attrs: {},
        slots: {},
        refs: {},
        // 子树， 就是 render 的返回值
        subTree: null,
        // 组件是否挂载
        isMounted: false,
    };

    instance.ctx = { _: instance };

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

    setupStatefulComponent(instance);
}

const publicPropertiesMap = {
    $el: instance => instance.vnode.el,
    $attrs: instance => instance.attrs,
    $slots: instance => instance.slots,
    $refs: instance => instance.refs,
    $nextTick: instance => {
        return nextTick.bind(instance);
    },
    $forceUpdate: instance => {
        return () => instance.update();
    },
};

const publicInstanceProxyHandlers = {
    get(target, key) {
        const { _: instance } = target;
        const { setupState, props } = instance;

        /**
         * 访问 key 的时候
         * 先去 setupState 中找
         * 没找到，再去 props 中找
         */
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }

        if (hasOwn(props, key)) {
            return props[key];
        }

        /**
         * key 在 publicPropertiesMap 中
         * eg: $attrs $refs $slots ....
         */
        if (hasOwn(publicPropertiesMap, key)) {
            const publicGetter = publicPropertiesMap[key];
            return publicGetter(instance);
        }

        /**
         * 以上均未找到
         */

        return instance[key];
    },

    set(target, key, value) {
        const { _: instance } = target;

        const { setupState } = instance;

        /**
         * 修改 setupState
         */
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }

        return true;
    },
};

function setupStatefulComponent(instance) {
    const { type } = instance;

    /**
     * 创建代理对象，内部访问 setupState props $attrs $slots ....
     */
    instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers);

    if (isFunction(type.setup)) {
        const setupContext = createSetupContext(instance);

        // 保存 setupContext
        instance.setupContext = setupContext;

        const setupResult = type.setup(instance.props, setupContext);

        handSetupResult(instance, setupResult);
    }

    if (!instance.render) {
        /**
         * 如果上面处理完，没有 render (setupResult不是function)，
         * 将 runder 函数给到 instance
         */
        instance.render = type.render;
    }
}

function handSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        // 如果 setupResult 是函数，就认定是render
        instance.render = setupResult;
    } else if (isObject(setupResult)) {
        // 如果反悔了对象，就是状态 拿到 setup 返回的状态
        instance.setupState = proxyRefs(setupResult);
    }
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
