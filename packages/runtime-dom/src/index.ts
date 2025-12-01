import { createRenderer } from '@vue/runtime-core';
import { nodeOps } from './nodeOps.js';
import { patchProp } from './patchProp.js';

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

export { renderOptions };
