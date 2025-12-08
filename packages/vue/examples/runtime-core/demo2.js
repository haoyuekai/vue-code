const obj1 = {
    a: 1,
};

const obj2 = Object.create(obj1);

const obj3 = Object.create(obj2);

console.log(obj2.__proto__ === obj1); // true

console.log(obj2.a); // 1

console.log(obj3.a); // 1
