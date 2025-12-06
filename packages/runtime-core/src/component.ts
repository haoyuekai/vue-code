import { proxyRefs } from '@vue/reactivity';
import { initProps, normalizePropsOptions } from './componentProps';
import { hasOwn, isFunction, isObject } from '@vue/shared';
import { nextTick } from './scheduler';
import { initSlots } from './componentSlots';

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

    // 等价于 instance.emit = (event, ...args) => emit(instance, event, ...args);
    instance.emit = emit.bind(null, instance);

    return instance;
}

/**
 * 初始化组件
 * @param instance
 */
export function setupComponent(instance) {
    /**
     * 初始化属性
     * 初始化插槽
     * 初始化状态
     */
    // 属性
    initProps(instance);

    // 插槽
    initSlots(instance);
    // 状态
    setupStatefulComponent(instance);
}

const publicPropertiesMap = {
    $el: instance => instance.vnode.el,
    $attrs: instance => instance.attrs,
    $emit: instance => instance.emit,
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

        /**
         * 设置当前组件实例
         */
        setCurrentInstance(instance);

        // 执行 setup 函数
        const setupResult = type.setup(instance.props, setupContext);

        /**
         * 清除当前组件实例
         */
        unSetCurrentInstance();

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
        // 除 props 外的属性
        get attrs() {
            return instance.attrs;
        },

        // 处理事件
        emit(event, ...args) {
            emit(instance, event, ...args);
        },

        // 插槽
        slots: instance.slots,
    };
}

/**
 * 处理组件传递的事件
 * @param instance
 * @param event
 * @param args
 */
function emit(instance, event, ...args) {
    /**
     * 转换事件名 fun => onFun
     */
    const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;

    // 获取事件处理函数
    const handler = instance.vnode.props?.[eventName];

    // 函数调用
    if (isFunction(handler)) {
        handler(...args);
    }
}

/**
 * 当前组件实例
 */
let currentInstance = null;

/**
 * 设置当前组件实例
 */
export function setCurrentInstance(instance) {
    currentInstance = instance;
}

/**
 * 获取当前组件实例
 */
export function getCurrentInstance() {
    return currentInstance;
}

/**
 * 清除当前组件实例
 */
export function unSetCurrentInstance() {
    currentInstance = null;
}
