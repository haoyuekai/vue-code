import { Link, startTrack, endTrack } from './system';

// 用来保存当前正在执行的effect
export let activeSub;

export function setActiveSub(sub) {
    activeSub = sub;
}

export class ReactiveEffect {
    // 依赖项链表头节点
    deps: Link | undefined;
    // 依赖项链表尾节点
    depsTail: Link | undefined;
    // 增加字段表示是否正在更新，避免effect触发依赖收集导致无限递归循环
    tracking = false;

    constructor(public fn) {}

    run() {
        // 先将之前的activeSub保存起来，用来处理嵌套的逻辑
        const prevSub = activeSub;

        // 每次执行 fn 之前，把 this 放到 activeSub 上
        activeSub = this;

        startTrack(this);

        try {
            return this.fn();
        } finally {
            // 执行完成后，把activeSub设置为prevSub
            endTrack(this);
            activeSub = prevSub;
        }
    }

    /**
     * 默认调用run，如果用户传了scheduler，实例属性优先级高于原型属性
     */
    scheduler() {
        this.run();
    }

    /**
     * 通知更新的方法，依赖发生变化时调用
     */
    notify() {
        this.scheduler();
    }
}

export function effect(fn, options) {
    const e = new ReactiveEffect(fn);

    Object.assign(e, options);

    e.run();

    const runner = e.run.bind(e);
    //
    runner.effect = e;
    return runner;
}
