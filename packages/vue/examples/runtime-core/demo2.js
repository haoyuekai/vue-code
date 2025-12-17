const obj1 = {
    a: 1,
};

const obj2 = Object.create(obj1);

const obj3 = Object.create(obj2);

console.log(obj2.__proto__ === obj1); // true

console.log(obj2.a); // 1

console.log(obj3.a); // 1

// 节流函数
function throttle(fn, delay) {
    let lastTime = 0;
    return function (...args.) {
        const now = Date.now();
        if (now - lastTime > delay) {
            lastTime = now
            return fn.call(this, ...args)
        }
    };
}
