import { h } from './h';

export function createAppAPI(render) {
    return function createApp(rootComponent, rootProps) {
        const app = {
            _container: null,

            // 挂载
            mount(container) {
                /**
                 * 根组件
                 * 要挂载的容器
                 */

                const vnode = h(rootComponent, rootProps);

                render(vnode, container);

                app._container = container;
            },

            // 卸载
            unmount() {
                render(null, app._container);
            },
        };

        return app;
    };
}
