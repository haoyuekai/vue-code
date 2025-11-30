import { activeSub } from './effect';
import { link, propagate, Link } from './system';

/**
 * 用来绑定target的key关联的所有Dep
 * obj = {a: 0, b: 1}
 * targetMap = {
 *  [obj]: {
 *    a: Dep,
 *    b: Dep
 *  }
 * }
 */
const targetMap = new WeakMap();

export function track(target, key) {
    if (!activeSub) {
        return;
    }

    /**
     * 查找depsMap = {
     *  a: Dep,
     *  b: Dep
     * }
     */
    let depsMap = targetMap.get(target);

    /**
     * 第一次收集target,
     * 创建一个新的map用来保存target和depsMap的关联关系
     */
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key);

    /**
     * 第一次收集target的key,
     * 创建新的dep,保存到depsMap中
     */
    if (!dep) {
        dep = new Dep();
        depsMap.set(key, dep);
    }
    // 绑定dep和sub之间的关联关系
    link(dep, activeSub);
}

export function trigger(target, key) {
    const depsMap = targetMap.get(target);

    // target没有在任何sub（effect）中访问过，没有收集过依赖
    if (!depsMap) return;

    const dep = depsMap.get(key);
    // key没有在任何sub（effect）中访问过，没有收集过依赖
    if (!dep) return;

    // 找到dep.subs（effect），通知他们重新执行
    propagate(dep.subs);
}
class Dep {
    // 订阅者链表的头结点
    subs: Link;
    // 订阅者链表的尾节点
    subsTail: Link;

    constructor() {}
}
