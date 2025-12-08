import { h } from './h';

export function createAppAPI(render) {
    return function createApp(rootComponent, rootProps) {
        /**
         * eg:
         */
        const context = {
            // 保存 app 后代组件使用 provide 注入的属性
            provides: {},
        };

        const app = {
            _container: null,

            // 挂载
            mount(container) {
                /**
                 * 根组件
                 * 要挂载的容器
                 */

                const vnode = h(rootComponent, rootProps);

                // 根组件绑定 appContext
                vnode.appContext = context;

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
