# 编译时

## 什么是运行时

代码在浏览器中运行的时候，就是运行时

## 什么是编译时

将模板编译成 js 的过程，就是编译时

> 构建工具中使用，工程化所做的事情

eg:

```vue
<template>
    <div id="container">Hello world</div>
</template>
```

1. 把 .vue 文件的内容，当做一个字符串，转换成 ast 语法树

```js
// 忽略 template
const ast = {
    type: 1, // 标签对应的标记
    tag: 'div',
    tagType: 0,
    props: [
        {
            type: 6,
            name: 'id',
            value: {
                type: 2,
                content: 'container',
            },
        },
    ],
    children: [
        {
            type: 2,
            content: 'Hello world',
        },
    ],
};
```

2. 把上面的 ast 语法树转换成运行时的代码

```js
const vnode = createElementBlock('div', { id: 'container' }, ['Hello world']);
```

ast 网站： https://astexplorer.net/
