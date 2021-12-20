# jest-to-exit-process

expectで指定した関数が内部でプロセス終了することをテストするためのマッチャーです。

```ts
expect(() => {
  process.exit();
}).toExitProcess();
```

のように使用します。

## `.toExitProcess(code?)`

関数が内部で`code`を指定し`process.exit`を呼ぶことを確認します。

`code`の指定を省略した場合は、`code`の比較を行いません。

```ts
test('testProgram', () => {
  expect(() => {
    testProgram();
  }).toExitProcess();
});
```

非同期関数を指定する場合には`expect`の前に`await`を忘れないようにしましょう。

```ts
test('testProgramAsync', async () => {
  await expect(async () => {
    await testProgramAsync();
  }).toExitProcess(1);
});
```
