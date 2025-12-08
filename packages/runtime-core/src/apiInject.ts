import { getCurrentInstance } from './component';

export function provide(key, value) {
    /**
     * 首次调用的时候， intance.provides 应该等于 parent.provides
     */

    // 获取当前组件实例
    const instance = getCurrentInstance();

    // 父组件的 provides || appContext.provides
    const parentProvides = instance.parent
        ? instance.parent.provides
        : instance.appContext.provides;

    // 获取实例上（自己的）的 provides
    let provides = instance.provides;

    if (provides === parentProvides) {
        /**
         * 组件首次调用 provide 方法，创建一个自己的 provides 继承父元素的 provides
         * 再往自己的 provides 里面添加属性
         *
         * 没调用的话，直接引用父元素的，往下传
         */
        instance.provides = Object.create(parentProvides);
        provides = instance.provides;
    }

    // 设置属性到 provides 上
    provides[key] = value;
}

export function inject(key, defaultValue) {
    const instance = getCurrentInstance();
    // 父组件的 provides || appContext.provides
    const parentProvides = instance.parent
        ? instance.parent.provides
        : instance.appContext.provides;

    if (key in parentProvides) {
        return parentProvides[key];
    }
    return defaultValue;
}
