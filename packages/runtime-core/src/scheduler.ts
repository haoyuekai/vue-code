const resolvePromise = Promise.resolve();

export function nextTick(fn) {
    // 用户传递的函数放到微任务队列
    return resolvePromise.then(() => fn.call(this));
}

export function queueJob(job) {
    // 渲染函数放到微任务队列
    resolvePromise.then(() => {
        job();
    });
}
