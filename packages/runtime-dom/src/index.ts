import { createRenderer } from '@vue/runtime-core';
import { nodeOps } from './nodeOps.js';
import { patchProp } from './patchProp.js';

export * from '@vue/runtime-core';

// createRenderer(nodeOps);

const renderOptions = {
    patchProp,
    ...nodeOps,
};

export { renderOptions };
