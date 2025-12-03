import { createRenderer } from '@vue/runtime-core';
import { nodeOps } from './nodeOps.js';
import { patchProp } from './patchProp.js';
import { isString } from '@vue/shared';

export * from '@vue/runtime-core';

// createRenderer(nodeOps);

const renderOptions = {
    patchProp,
    ...nodeOps,
};

const renderer = createRenderer(renderOptions);

export function render(vnode, container) {
    renderer.render(vnode, container);
}

export function createApp(rootComponent, rootProps) {
    const app = renderer.createApp(rootComponent, rootProps);
    const _mount = app.mount.bind(app);
    /**
     * 重写 app mount  使用dom查询获取元素，兼容传入的是选择器，
     * @param selector
     */
    function mount(selector) {
        let el = selector;
        if (isString(selector)) {
            el = document.querySelector(selector);
        }
        _mount(el);
    }
    app.mount = mount;

    return app;
}

export { renderOptions };
